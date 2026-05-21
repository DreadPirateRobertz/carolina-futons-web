/**
 * /returns page smoke tests — cfw-qpy
 *
 * Static policy page (pure SSC, no client components). Tests confirm key
 * sections render, contact links are present, and the page loads cleanly.
 *
 * Run with:
 *   npx playwright test e2e/returns-page.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

const PAGE_TIMEOUT = 15_000;

async function gotoReturns(page: Page) {
  await page.goto("/returns");
  await page.getByRole("heading", { level: 1 }).waitFor({
    state: "visible",
    timeout: PAGE_TIMEOUT,
  });
}

test.describe("/returns — page smoke", () => {
  test.setTimeout(30_000);

  test("page loads without 404 or redirect", async ({ page }) => {
    const response = await page.goto("/returns");
    expect(response?.status()).toBe(200);
    expect(page.url()).toContain("/returns");
  });

  test("h1 'Returns' is visible", async ({ page }) => {
    await gotoReturns(page);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toContainText(/returns/i);
  });

  test("policy section heading is visible", async ({ page }) => {
    await gotoReturns(page);
    // Multiple h2 sections: "The return window", "Refund amounts",
    // "How to start a return", etc. — any one suffices.
    const firstSection = page.getByRole("heading", { level: 2 }).first();
    await expect(firstSection).toBeVisible();
    await expect(firstSection).not.toBeEmpty();
  });

  test("contact link is present", async ({ page }) => {
    await gotoReturns(page);
    // Returns page links to the business email (mailto:) and phone (tel:)
    // for starting a return — either satisfies the "contact link" requirement.
    const contactLink = page
      .getByRole("link")
      .filter({ hasText: /carolinafutons@gmail\.com|828.*252.*9449/i })
      .first();
    await expect(contactLink).toBeVisible();
  });

  test("page loads with no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/returns");
    await page.getByRole("heading", { level: 1 }).waitFor({
      state: "visible",
      timeout: PAGE_TIMEOUT,
    });

    expect(consoleErrors).toHaveLength(0);
  });
});
