/**
 * Email trigger E2E — cf-s44d (Stilgar directive)
 *
 * Coverage:
 *   1. Welcome email queued on new account creation (POST /api/email/trigger
 *      with type="welcome" fired client-side after successful /api/auth/register)
 *   2. Cart recovery email queued when cart is non-empty and user navigates away
 *      (visibilitychange → CartAbandonmentTracker fires POST /api/email/trigger
 *      with type="cart-recovery")
 *   3. No duplicate welcome sends — trigger not fired on register failure
 *
 * All tests mock HTTP at the browser level (page.route) so no live Wix
 * session, SMTP server, or Velo backend is required in CI.
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/email-triggers.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

// ── helpers ────────────────────────────────────────────────────────────────

/** Intercept POST /api/auth/register and return a synthetic response. */
async function mockRegister(
  page: Page,
  response: Record<string, unknown>,
  status = 200,
) {
  await page.route("**/api/auth/register", (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(response) }),
  );
}

/** Set up a route handler for /api/email/trigger and return a promise that
 *  resolves to the first request body received, or null after timeoutMs. */
function captureEmailTrigger(
  page: Page,
  { fulfillWith = { ok: true }, timeoutMs = 5_000 } = {},
) {
  return new Promise<Record<string, unknown> | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    page.route("**/api/email/trigger", async (route) => {
      clearTimeout(timer);
      const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(fulfillWith),
      });
      resolve(body);
    });
  });
}

// ── 1. Welcome email on successful sign-up ─────────────────────────────────

test.describe("welcome email trigger", () => {
  test("fires POST /api/email/trigger with type=welcome after successful register", async ({
    page,
  }) => {
    // Capture the trigger call BEFORE the form submit so the route is wired.
    const triggerCapture = captureEmailTrigger(page);

    // Mock register to return a successful response (no actual Wix call).
    await mockRegister(page, { ok: true, redirectTo: "/dashboard" });
    // Mock the redirect destination so page navigation doesn't 404.
    await page.route("**/dashboard", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>dash</body></html>" }),
    );

    await page.goto("/signup");
    await page.getByLabel(/^email$/i).fill("newuser@example.com");
    await page.getByLabel(/^password$/i).fill("password123");
    await page.getByLabel(/confirm password/i).fill("password123");
    await page.getByRole("button", { name: /create account/i }).click();

    const body = await triggerCapture;
    expect(body).not.toBeNull();
    expect(body!.type).toBe("welcome");
    expect(body!.email).toBe("newuser@example.com");
  });

  test("does NOT fire email trigger when register returns an error", async ({
    page,
  }) => {
    let triggerFired = false;
    await page.route("**/api/email/trigger", (route) => {
      triggerFired = true;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });

    await mockRegister(
      page,
      { error: "An account with that email already exists." },
      409,
    );

    await page.goto("/signup");
    await page.getByLabel(/^email$/i).fill("existing@example.com");
    await page.getByLabel(/^password$/i).fill("password123");
    await page.getByLabel(/confirm password/i).fill("password123");
    await page.getByRole("button", { name: /create account/i }).click();

    // Error message visible — trigger must not have fired.
    await expect(page.locator("form").getByRole("alert")).toBeVisible();
    expect(triggerFired).toBe(false);
  });

  test("does NOT fire email trigger when email_verification_required", async ({
    page,
  }) => {
    let triggerFired = false;
    await page.route("**/api/email/trigger", (route) => {
      triggerFired = true;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });

    await mockRegister(page, { state: "email_verification_required" });

    await page.goto("/signup");
    await page.getByLabel(/^email$/i).fill("verify@example.com");
    await page.getByLabel(/^password$/i).fill("password123");
    await page.getByLabel(/confirm password/i).fill("password123");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByRole("heading", { name: /check your email/i })).toBeVisible();
    expect(triggerFired).toBe(false);
  });
});

// ── 2. Cart recovery trigger on page-hide ─────────────────────────────────

test.describe("cart-recovery email trigger", () => {
  const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 — cart needs items");

  test("fires POST /api/email/trigger with type=cart-recovery when user leaves with items in cart", async ({
    page,
  }) => {
    const KINGSTON_PDP = "/products/kingston-futon-frame";

    const triggerCapture = captureEmailTrigger(page, { timeoutMs: 8_000 });

    await page.goto(KINGSTON_PDP);
    // Wait for PDP to render the Add to cart button (fixture mode).
    const addBtn = page.locator('button:has-text("Add to cart")').first();
    await expect(addBtn).toBeVisible({ timeout: 15_000 });
    await addBtn.click();

    // Brief wait for cart state to settle after add.
    await page.waitForTimeout(500);

    // Simulate the user leaving by navigating away — this triggers pagehide /
    // visibilitychange and CartAbandonmentTracker fires the trigger.
    await page.goto("/");

    const body = await triggerCapture;
    expect(body).not.toBeNull();
    expect(body!.type).toBe("cart-recovery");
    const items = body!.items as { productId: string; quantity: number }[];
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    expect(typeof items[0].productId).toBe("string");
    expect(items[0].quantity).toBeGreaterThan(0);
  });

  test("does NOT fire cart-recovery trigger when cart is empty", async ({
    page,
  }) => {
    let triggerFired = false;
    await page.route("**/api/email/trigger", (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      if (body.type === "cart-recovery") triggerFired = true;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });

    // Navigate away from a page with empty cart.
    await page.goto("/shop");
    await page.goto("/");

    // Small settle window.
    await page.waitForTimeout(300);
    expect(triggerFired).toBe(false);
  });

  test("does NOT fire duplicate cart-recovery triggers on multiple navigations", async ({
    page,
  }) => {
    const KINGSTON_PDP = "/products/kingston-futon-frame";
    let triggerCount = 0;

    await page.route("**/api/email/trigger", (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      if (body.type === "cart-recovery") triggerCount++;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });

    await page.goto(KINGSTON_PDP);
    const addBtn = page.locator('button:has-text("Add to cart")').first();
    await expect(addBtn).toBeVisible({ timeout: 15_000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    // Navigate away once — trigger fires.
    await page.goto("/shop");
    await page.waitForTimeout(300);

    // Navigate again — dedup guard (sentRef) should prevent a second fire.
    await page.goto("/");
    await page.waitForTimeout(300);

    expect(triggerCount).toBe(1);
  });
});

// ── 3. Trigger API contract ────────────────────────────────────────────────

test.describe("POST /api/email/trigger — API contract", () => {
  test("returns 400 when type is missing", async ({ request }) => {
    const res = await request.post("/api/email/trigger", {
      data: { email: "a@b.com" },
    });
    expect(res.status()).toBe(400);
  });

  test("returns 400 when email is missing for welcome type", async ({ request }) => {
    const res = await request.post("/api/email/trigger", {
      data: { type: "welcome" },
    });
    expect(res.status()).toBe(400);
  });

  test("returns 200 ok:true in fixture mode", async ({ request }) => {
    test.skip(
      process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS !== "1",
      "fixture-mode skips Velo call — only meaningful when NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1",
    );
    const res = await request.post("/api/email/trigger", {
      data: { type: "welcome", email: "a@b.com" },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok: boolean; skipped?: string };
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe("fixture-mode");
  });
});
