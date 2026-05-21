/**
 * /registry page smoke tests — cfw-03p
 *
 * The registry page is force-dynamic and session-gated. An unauthenticated
 * visitor (no Wix member cookie) sees the auth gate: h1 heading, a sign-in
 * prompt, and a link to /account. Tests use the default (no-auth) state so
 * no fixture setup or auth.setup dependency is required.
 *
 * Run with:
 *   npx playwright test e2e/registry-page.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

const PAGE_TIMEOUT = 15_000;

async function gotoRegistry(page: Page) {
  await page.goto("/registry");
  await page.getByRole("heading", { level: 1 }).waitFor({
    state: "visible",
    timeout: PAGE_TIMEOUT,
  });
}

test.describe("/registry — page smoke (unauthenticated)", () => {
  test.setTimeout(30_000);

  test("page does not return 404", async ({ page }) => {
    const response = await page.goto("/registry");
    expect(response?.status()).not.toBe(404);
  });

  test("h1 heading is visible", async ({ page }) => {
    await gotoRegistry(page);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    // Fallback from REGISTRY_COPY_FALLBACKS.heading
    await expect(h1).toContainText(/gift registry/i);
  });

  test("sign-in prompt is shown to unauthenticated visitor", async ({ page }) => {
    await gotoRegistry(page);
    // Fallback from REGISTRY_COPY_FALLBACKS.unauthenticatedBody
    await expect(
      page.getByText(/sign in to create and manage your gift registries/i),
    ).toBeVisible();
  });

  test("link to /account is present", async ({ page }) => {
    await gotoRegistry(page);
    const signInLink = page.getByRole("link", { name: /sign in/i });
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute("href", "/account");
  });

  test("page loads with no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/registry");
    await page.getByRole("heading", { level: 1 }).waitFor({
      state: "visible",
      timeout: PAGE_TIMEOUT,
    });

    expect(consoleErrors).toHaveLength(0);
  });
});
