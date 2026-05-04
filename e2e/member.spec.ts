/**
 * Member-authenticated E2E specs.
 *
 * Runs under the "member" Playwright project, which inherits the session cookie
 * saved by auth.setup.ts. When TEST_MEMBER_EMAIL / TEST_MEMBER_PASSWORD are
 * absent, auth.setup.ts writes an empty storageState and the skipIfNoSession
 * guard marks each test skipped cleanly rather than failing.
 *
 * To run against staging:
 *   TEST_MEMBER_EMAIL=… TEST_MEMBER_PASSWORD=… BASE_URL=… \
 *     npx playwright test --project=member
 */

import { test, expect } from "@playwright/test";

async function skipIfNoSession(page: import("@playwright/test").Page) {
  const url = page.url();
  if (url.includes("/account") || url.includes("auth_required")) {
    test.skip();
  }
}

test.describe("member dashboard (authenticated)", () => {
  test("logged-in member sees the dashboard shell", async ({ page }) => {
    await page.goto("/dashboard");
    await skipIfNoSession(page);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /Welcome back/i,
    );
    await expect(
      page.getByRole("navigation", { name: "Account sections" }),
    ).toBeVisible();
  });

  test("orders tab renders order history section", async ({ page }) => {
    await page.goto("/dashboard/orders");
    await skipIfNoSession(page);

    await expect(page).toHaveURL(/\/dashboard\/orders/);
    await expect(
      page.getByRole("heading", { name: /your orders/i }),
    ).toBeVisible();
  });

  test("wishlist tab renders wishlist section", async ({ page }) => {
    await page.goto("/dashboard/wishlist");
    await skipIfNoSession(page);

    await expect(page).toHaveURL(/\/dashboard\/wishlist/);
    await expect(
      page.getByRole("heading", { name: /your wishlist/i }),
    ).toBeVisible();
  });

  test("preferences tab renders notification preferences form", async ({
    page,
  }) => {
    await page.goto("/dashboard/preferences");
    await skipIfNoSession(page);

    await expect(page).toHaveURL(/\/dashboard\/preferences/);
    await expect(
      page.getByRole("heading", { name: /notification preferences/i }),
    ).toBeVisible();
  });

  test("profile tab renders profile details and logout button", async ({
    page,
  }) => {
    await page.goto("/dashboard/profile");
    await skipIfNoSession(page);

    await expect(page).toHaveURL(/\/dashboard\/profile/);
    await expect(page.getByRole("heading", { name: /profile/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign out|log out/i }),
    ).toBeVisible();
  });

  test("logout clears session and redirects to /account", async ({ page }) => {
    await page.goto("/dashboard/profile");
    await skipIfNoSession(page);

    await page.getByRole("button", { name: /sign out|log out/i }).click();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/account/);
  });
});
