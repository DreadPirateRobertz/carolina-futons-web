/**
 * Rewards & gamification E2E smoke tests — cf-1409
 *
 * Coverage:
 *   1. Reward trigger — purchase → order-confirmation renders (fixture mode)
 *   2. Cross-rig badge_earned / tier_changed event ingestion via /api/cross-rig
 *   3. /api/cross-rig auth guard (no-creds, always runs in CI)
 *   4. Points balance — MembershipCard on /dashboard (staging only, needs live creds)
 *   5. Challenge start + progress update (skip: UI not yet built — cf-1409.5)
 *
 * Run fixture suites:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/rewards.spec.ts
 *
 * Run cross-rig contract suite (adds auth'd endpoint tests):
 *   CROSS_RIG_SECRET=<secret> npx playwright test e2e/rewards.spec.ts
 */

import { test, expect } from "@playwright/test";

const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";
const CROSS_RIG_SECRET = process.env.CROSS_RIG_SECRET ?? "";
const FULL_FLOW = Boolean(
  process.env.TEST_MEMBER_EMAIL && process.env.TEST_MEMBER_PASSWORD,
);

// ── 1. Reward trigger — purchase (fixture mode) ───────────────────────────────

test.describe("reward trigger — purchase (fixture mode)", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(45_000);

  test("fixture checkout completes and order-confirmation renders", async ({
    page,
  }) => {
    await page.goto("/products/kingston-futon-frame");

    const addBtn = page.locator('button:has-text("Add to cart")');
    await expect(addBtn).toBeEnabled({ timeout: 15_000 });
    await addBtn.click();

    const checkoutCta = page.locator('[data-testid="cart-checkout-cta"]');
    await expect(checkoutCta).toContainText(/checkout/i, { timeout: 5_000 });
    await checkoutCta.click();

    await page.waitForURL(/order-confirmation/, { timeout: 15_000 });
    expect(page.url()).toContain("fixture-test-order");
  });

  test("order-confirmation shows 'Thanks for your order' with fixture line item", async ({
    page,
  }) => {
    // Navigate directly to the fixture order confirmation page.
    await page.goto("/order-confirmation?orderId=fixture-test-order");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /thanks for your order/i,
      { timeout: 15_000 },
    );
    await expect(page.getByText("Order #CF-FIXTURE-001")).toBeVisible();
    await expect(page.getByText("Kingston Futon Frame")).toBeVisible();
    await expect(page.getByText("$399.00")).toBeVisible();
  });

  test("order-confirmation shows continue-shopping CTA", async ({ page }) => {
    await page.goto("/order-confirmation?orderId=fixture-test-order");

    const cta = page.getByRole("link", { name: /continue shopping/i });
    await expect(cta).toBeVisible({ timeout: 15_000 });
    await expect(cta).toHaveAttribute("href", "/shop");
  });

  // Reward events are fired server-side by the Velo backend after a real order.
  // Fixture orders don't call Velo; the gamification side-effects are tested
  // in the cross-rig contract suite below and in unit tests.
});

// ── 2 & 3. /api/cross-rig — badge + tier events ──────────────────────────────

test.describe("/api/cross-rig — auth guard (no credentials needed)", () => {
  test("rejects request with no x-cross-rig-secret header — 401", async ({
    request,
  }) => {
    const res = await request.post("/api/cross-rig", {
      data: {
        memberId: "m1",
        event: "badge_earned",
        sourceRig: "cfutons_mobile",
        payload: { badgeId: "first-purchase" },
      },
    });
    expect(res.status()).toBe(401);
  });

  test("rejects request with wrong x-cross-rig-secret header — 401", async ({
    request,
  }) => {
    const res = await request.post("/api/cross-rig", {
      data: {
        memberId: "m1",
        event: "badge_earned",
        sourceRig: "cfutons_mobile",
        payload: { badgeId: "first-purchase" },
      },
      headers: { "x-cross-rig-secret": "not-the-right-secret" },
    });
    expect(res.status()).toBe(401);
  });

  test("rejects malformed JSON body — 400", async ({ request }) => {
    const res = await request.post("/api/cross-rig", {
      data: Buffer.from("{not-json", "utf8"),
      headers: {
        "content-type": "application/json",
        "x-cross-rig-secret": CROSS_RIG_SECRET || "dummy",
      },
    });
    // 401 when secret is wrong/dummy; 400 if secret is valid but JSON is bad.
    expect([400, 401]).toContain(res.status());
  });
});

test.describe("/api/cross-rig — badge_earned + tier_changed contract", () => {
  test.skip(
    !CROSS_RIG_SECRET,
    "CROSS_RIG_SECRET not set — skipping cross-rig contract tests",
  );

  test("badge_earned event accepted — 200 with ok:true", async ({
    request,
  }) => {
    const res = await request.post("/api/cross-rig", {
      data: {
        memberId: "fixture-member-1",
        event: "badge_earned",
        sourceRig: "cfutons_mobile",
        payload: { badgeId: "first-purchase" },
      },
      headers: { "x-cross-rig-secret": CROSS_RIG_SECRET },
    });
    expect(res.status()).toBe(200);
    const json = (await res.json()) as {
      ok: boolean;
      event: string;
      memberId: string;
    };
    expect(json.ok).toBe(true);
    expect(json.event).toBe("badge_earned");
    expect(json.memberId).toBe("fixture-member-1");
  });

  test("tier_changed event accepted — 200 with ok:true", async ({
    request,
  }) => {
    const res = await request.post("/api/cross-rig", {
      data: {
        memberId: "fixture-member-1",
        event: "tier_changed",
        sourceRig: "cfutons_mobile",
        payload: { newTier: "mountain_guide" },
      },
      headers: { "x-cross-rig-secret": CROSS_RIG_SECRET },
    });
    expect(res.status()).toBe(200);
    const json = (await res.json()) as { ok: boolean; event: string };
    expect(json.ok).toBe(true);
    expect(json.event).toBe("tier_changed");
  });

  test("social_share_completed event accepted — 200", async ({ request }) => {
    const res = await request.post("/api/cross-rig", {
      data: {
        memberId: "fixture-member-2",
        event: "social_share_completed",
        sourceRig: "cfutons_mobile",
        payload: { platform: "instagram", productSlug: "kingston-futon-frame" },
      },
      headers: { "x-cross-rig-secret": CROSS_RIG_SECRET },
    });
    expect(res.status()).toBe(200);
  });

  test("unknown event type returns 400", async ({ request }) => {
    const res = await request.post("/api/cross-rig", {
      data: {
        memberId: "fixture-member-1",
        event: "purchase_completed",
        sourceRig: "cfutons_mobile",
        payload: {},
      },
      headers: { "x-cross-rig-secret": CROSS_RIG_SECRET },
    });
    expect(res.status()).toBe(400);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/unsupported event/i);
  });

  test("unknown sourceRig returns 400", async ({ request }) => {
    const res = await request.post("/api/cross-rig", {
      data: {
        memberId: "fixture-member-1",
        event: "badge_earned",
        sourceRig: "cfutons_web",
        payload: { badgeId: "b1" },
      },
      headers: { "x-cross-rig-secret": CROSS_RIG_SECRET },
    });
    expect(res.status()).toBe(400);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/unknown sourceRig/i);
  });

  test("tier_changed without newTier payload returns 400", async ({
    request,
  }) => {
    const res = await request.post("/api/cross-rig", {
      data: {
        memberId: "fixture-member-1",
        event: "tier_changed",
        sourceRig: "cfutons_mobile",
        payload: {},
      },
      headers: { "x-cross-rig-secret": CROSS_RIG_SECRET },
    });
    expect(res.status()).toBe(400);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(false);
  });

  test("missing memberId returns 400", async ({ request }) => {
    const res = await request.post("/api/cross-rig", {
      data: {
        event: "badge_earned",
        sourceRig: "cfutons_mobile",
        payload: { badgeId: "b1" },
      },
      headers: { "x-cross-rig-secret": CROSS_RIG_SECRET },
    });
    expect(res.status()).toBe(400);
  });
});

// ── 4. Points balance — MembershipCard on /dashboard ─────────────────────────

test.describe("/dashboard — MembershipCard points balance (staging only)", () => {
  test.skip(
    !FULL_FLOW,
    "Set TEST_MEMBER_EMAIL + TEST_MEMBER_PASSWORD to run the full login → points balance flow.",
  );

  test("logged-in member sees MembershipCard with tier and points", async ({
    page,
  }) => {
    // Authenticate via the API, then navigate to the dashboard.
    const post = await page.request.post("/api/auth/session", {
      data: { callbackUrl: "/dashboard" },
    });
    expect(post.ok()).toBeTruthy();
    const { authUrl } = (await post.json()) as { authUrl: string };

    await page.goto(authUrl);
    await page.getByLabel(/email/i).fill(process.env.TEST_MEMBER_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.TEST_MEMBER_PASSWORD!);
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);

    const card = page.locator('[data-slot="membership-card"]');
    await expect(card).toBeVisible({ timeout: 10_000 });

    // Points should be a non-negative number.
    const pointsText = await card.getByText(/points/).textContent();
    const pointsMatch = pointsText?.match(/[\d,]+/);
    expect(pointsMatch).not.toBeNull();
    expect(parseInt((pointsMatch?.[0] ?? "0").replace(/,/g, ""), 10)).toBeGreaterThanOrEqual(0);

    // Tier name must be a non-empty string.
    const tierEl = card.locator("p.text-cf-cta").first();
    await expect(tierEl).not.toBeEmpty();
  });
});

// ── 5. Challenge start + progress update ─────────────────────────────────────
// Challenge UI (challenge card, start CTA, progress indicator) is not yet
// built. This block is reserved for cf-1409.5 once the components land.

test.describe("challenge start + progress update (pending UI)", () => {
  test.skip(
    true,
    "Challenge UI not yet built — spec will be completed once /dashboard/challenges components land (cf-1409.5).",
  );

  test("challenge card renders on /dashboard/challenges", async () => {
    // TODO: navigate to /dashboard/challenges, verify at least one challenge card renders.
  });

  test("clicking Start challenge updates progress state", async () => {
    // TODO: click Start CTA on first challenge, verify progress indicator appears.
  });
});
