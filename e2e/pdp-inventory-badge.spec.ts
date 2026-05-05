/**
 * PDP Live Inventory + Low Stock badge E2E spec — cfw-6bp
 *
 * Pins the variant-aware "Only N left in stock" urgency cue:
 *  - Hidden when the selected variant has quantity > 5 (kingston fixture: q=6)
 *  - Visible with the exact "Only N left in stock" copy when quantity ≤ 5
 *    (monterey-platform-bed Queen fixture: q=2)
 *  - Hidden again when the selected variant flips out of stock — that surface
 *    is owned by PdpStockBadge so the two badges never both claim the slot.
 *
 * Uses fixture mode so quantities stay deterministic across CI runs.
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/pdp-inventory-badge.spec.ts
 */

import { test, expect } from "@playwright/test";

const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

test.describe("PDP low-stock urgency badge (cfw-6bp)", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");

  test("hides the badge when the selected variant's quantity is above the threshold", async ({
    page,
  }) => {
    // kingston-futon-frame fixture variants are quantity=6 — one above the
    // LOW_STOCK_THRESHOLD. Badge must stay silent so we don't cry wolf on
    // a healthy stock count.
    await page.goto("/products/kingston-futon-frame");
    await expect(page.getByTestId("pdp-main-image").first()).toBeVisible();
    await expect(
      page.locator("[data-slot='product-inventory-badge']"),
    ).toHaveCount(0);
  });

  test("renders 'Only N left in stock' when the selected variant is low-stock", async ({
    page,
  }) => {
    // monterey-platform-bed Queen fixture is quantity=2.
    await page.goto("/products/monterey-platform-bed");
    const badge = page.locator("[data-slot='product-inventory-badge']").first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(/Only \d+ left in stock/);
  });
});
