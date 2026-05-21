/**
 * /guides page smoke tests — cfw-6mm
 *
 * Static listing page backed by Wix CMS with static fallback guides.
 * Tests confirm the page loads, the guide list renders with valid links, and
 * no console errors fire. No fixture gate needed — fallback guides always render.
 *
 * Run with:
 *   npx playwright test e2e/guides-page.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

const PAGE_TIMEOUT = 15_000;

async function gotoGuides(page: Page) {
  await page.goto("/guides");
  await page.getByRole("heading", { level: 1 }).waitFor({
    state: "visible",
    timeout: PAGE_TIMEOUT,
  });
}

test.describe("/guides — page smoke", () => {
  test.setTimeout(30_000);

  test("page loads without 404 or redirect", async ({ page }) => {
    const response = await page.goto("/guides");
    expect(response?.status()).toBe(200);
    expect(page.url()).toContain("/guides");
  });

  test("h1 is visible on page load", async ({ page }) => {
    await gotoGuides(page);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).not.toBeEmpty();
  });

  test("at least one guide card link is visible", async ({ page }) => {
    await gotoGuides(page);
    // Guide cards are <Link href="/guides/<slug>"> — rendered as <a> tags
    const firstGuideLink = page.locator('a[href^="/guides/"]').first();
    await expect(firstGuideLink).toBeVisible({ timeout: PAGE_TIMEOUT });
  });

  test("all guide links have non-empty href attributes", async ({ page }) => {
    await gotoGuides(page);
    const guideLinks = page.locator('a[href^="/guides/"]');
    const count = await guideLinks.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const href = await guideLinks.nth(i).getAttribute("href");
      expect(href, `guide link[${i}] must have non-empty href`).toMatch(
        /^\/guides\/.+/,
      );
    }
  });

  test("page loads with no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/guides");
    await page.getByRole("heading", { level: 1 }).waitFor({
      state: "visible",
      timeout: PAGE_TIMEOUT,
    });

    expect(consoleErrors).toHaveLength(0);
  });
});
