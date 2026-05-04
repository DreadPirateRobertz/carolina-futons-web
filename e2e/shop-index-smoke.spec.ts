/**
 * /shop index hub smoke test — cf-3qt.13
 *
 * Verifies the collection-grid hub renders at least 5 category cards and
 * that each card links to a /shop/[category] PLP.
 *
 * Page implementation landed in prior beads (cf-shop-mascot, cf-delight).
 * This file adds the E2E acceptance gate.
 *
 * Run with:
 *   npx playwright test e2e/shop-index-smoke.spec.ts
 */

import { test, expect } from "@playwright/test";

test.describe("/shop index hub", () => {
  test.setTimeout(30_000);

  test("renders heading and >= 5 category cards", async ({ page }) => {
    await page.goto("/shop");

    const heading = page.getByRole("heading", { level: 1, name: /^shop$/i });
    await expect(heading).toBeVisible();

    // Scope to <main> so footer ul > li elements don't contaminate the count.
    const cards = page.locator('main ul > li [data-slot="category-card"]');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("each category card links into /shop/[category]", async ({ page }) => {
    await page.goto("/shop");

    const cards = page.locator('main ul > li [data-slot="category-card"]');
    await expect(cards.first()).toBeVisible();

    const hrefs = await cards.evaluateAll((anchors: HTMLAnchorElement[]) =>
      anchors.map((a) => a.getAttribute("href")),
    );
    expect(hrefs.length).toBeGreaterThanOrEqual(5);
    for (const href of hrefs) {
      expect(href).toMatch(/^\/shop\/.+/);
    }
  });

  test("clicking first card navigates to its /shop/<slug> PLP with a visible H1", async ({
    page,
  }) => {
    await page.goto("/shop");

    const firstCard = page.locator('main ul > li [data-slot="category-card"]').first();
    await expect(firstCard).toBeVisible();

    const href = await firstCard.getAttribute("href");
    expect(href).toMatch(/^\/shop\/.+/);

    await firstCard.click();
    await page.waitForURL(href!);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
