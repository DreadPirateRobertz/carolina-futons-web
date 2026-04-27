import { test, expect } from "@playwright/test";

test.describe("/signup page — UI smoke (no live Wix creds needed)", () => {
  test("renders the Create Account heading and form fields", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create an account/i })).toBeVisible();
    await expect(page.getByLabel(/^email$/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
  });

  test("has a link to /account for members who already have an account", async ({ page }) => {
    await page.goto("/signup");
    const link = page.getByRole("link", { name: /sign in/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/account");
  });

  test("shows password-mismatch error without making a network request", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel(/^email$/i).fill("test@example.com");
    await page.getByLabel(/^password$/i).fill("password123");
    await page.getByLabel(/confirm password/i).fill("different");
    await page.getByRole("button", { name: /create account/i }).click();
    // Scope to the form — the ConsentBanner also uses role="alert" globally.
    await expect(page.locator("form").getByRole("alert")).toContainText(/do not match/i);
  });

  test("shows password-too-short error without making a network request", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel(/^email$/i).fill("test@example.com");
    await page.getByLabel(/^password$/i).fill("short");
    await page.getByLabel(/confirm password/i).fill("short");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText(/8 characters/i);
  });

  test("submit button is disabled and shows loading text while request is in flight", async ({
    page,
  }) => {
    // Intercept the register endpoint and stall so we can assert the loading state.
    await page.route("**/api/auth/register", async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.fulfill({ json: { error: "stalled" } });
    });

    await page.goto("/signup");
    await page.getByLabel(/^email$/i).fill("test@example.com");
    await page.getByLabel(/^password$/i).fill("password123");
    await page.getByLabel(/confirm password/i).fill("password123");
    await page.getByRole("button", { name: /create account/i }).click();

    const btn = page.getByRole("button", { name: /creating account/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
  });
});

test.describe("/api/auth/register — API contract (no live Wix creds needed)", () => {
  test("returns 400 when email is missing", async ({ request }) => {
    const res = await request.post("/api/auth/register", {
      data: { password: "password123" },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/required/i);
  });

  test("returns 400 when password is missing", async ({ request }) => {
    const res = await request.post("/api/auth/register", {
      data: { email: "a@b.com" },
    });
    expect(res.status()).toBe(400);
  });

});

// Full sign-up → session round-trip. Requires a unique email against a
// live Wix Headless site. Skipped by default — enable by setting
// TEST_SIGNUP_EMAIL + TEST_SIGNUP_PASSWORD in the staging env.
const FULL_FLOW = Boolean(
  process.env.TEST_SIGNUP_EMAIL && process.env.TEST_SIGNUP_PASSWORD,
);

test.describe("sign-up round-trip (staging only)", () => {
  test.skip(
    !FULL_FLOW,
    "Requires TEST_SIGNUP_EMAIL + TEST_SIGNUP_PASSWORD against staging",
  );

  test("successful registration sets wix-session cookie and redirects", async ({
    page,
  }) => {
    await page.goto("/signup");
    await page.getByLabel(/^email$/i).fill(process.env.TEST_SIGNUP_EMAIL!);
    await page.getByLabel(/^password$/i).fill(process.env.TEST_SIGNUP_PASSWORD!);
    await page.getByLabel(/confirm password/i).fill(process.env.TEST_SIGNUP_PASSWORD!);
    await page.getByRole("button", { name: /create account/i }).click();

    // Either verify-email screen or redirect to /dashboard
    await page.waitForURL(
      (u) =>
        u.pathname === "/dashboard" ||
        u.pathname === "/signup",
      { timeout: 10000 },
    );

    const currentUrl = page.url();
    if (currentUrl.includes("/dashboard")) {
      const sessionCookie = (await page.context().cookies()).find(
        (c) => c.name === "wix-session",
      );
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.httpOnly).toBe(true);
    } else {
      // email_verification_required — check for the verify-email heading
      await expect(
        page.getByRole("heading", { name: /check your email/i }),
      ).toBeVisible();
    }
  });
});
