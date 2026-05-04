/**
 * /shop index hub smoke test — cf-3qt.13
 *
 * Verifies the collection-grid hub renders all category cards and that
 * each card links to a /shop/[category] PLP.
 *
 * Run with:
 *   npx playwright test e2e/shop-index-smoke.spec.ts
 */

import { test, expect } from "@playwright/test";

const SHOP_TIMEOUT = 15_000;

test.describe("/shop index hub", () => {
  test.setTimeout(30_000);

  test("renders heading and >= 5 category cards", async ({ page }) => {
    await page.goto("/shop");
    await page.waitForSelector("h1", { timeout: SHOP_TIMEOUT });

    const heading = page.getByRole("heading", { level: 1, name: /^shop$/i });
    await expect(heading).toBeVisible();

    const cards = page.locator("ul > li");
    await expect(cards).toHaveCount(
      await cards.count().then((n) => Math.max(n, 5)),
    );
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("each category card links into /shop/[category]", async ({ page }) => {
    await page.goto("/shop");
    await page.waitForSelector("ul > li a", { timeout: SHOP_TIMEOUT });

    const links = page.locator("ul > li a");
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(5);

    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute("href");
      expect(href).toMatch(/^\/shop\/.+/);
    }
  });
});
