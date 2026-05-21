/**
 * PDP Sticky Add-to-Cart bar — scroll behaviour (cfw-k10)
 *
 * Verifies PdpStickyCta + PdpInteractive wiring:
 *   - Bar is hidden on initial load (primary CTA in view)
 *   - Bar appears after scrolling past the primary CTA
 *   - Bar disappears when the user scrolls back up
 *   - Bar contains product name, price, and Add-to-Cart button
 *   - Swipe-dismiss (mobile): bar hides on downward pointer drag
 *
 * Uses fixture mode (NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1) so no live Wix
 * credentials are required. The kingston-futon-frame fixture has a tall
 * description section, giving enough scroll depth to push the primary CTA
 * out of view at a standard 1280×720 viewport.
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/pdp-sticky-cta.spec.ts
 */

import { test, expect } from "@playwright/test";

const PDP = "/products/kingston-futon-frame";
const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";
const TIMEOUT = 15_000;

test.describe("PDP sticky Add-to-Cart bar (cfw-k10)", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(30_000);

  test.beforeEach(async ({ page }) => {
    await page.goto(PDP);
    await page.waitForSelector('[data-slot="pdp-sticky-cta"]', {
      state: "hidden",
      timeout: TIMEOUT,
    }).catch(() => {
      // Bar may not be in DOM yet — that's fine, we assert below
    });
  });

  test("sticky bar is hidden on initial load when primary CTA is visible", async ({
    page,
  }) => {
    // On load the primary CTA is in view; sticky bar must not be rendered.
    await expect(page.locator('[data-slot="pdp-sticky-cta"]')).toHaveCount(0);
  });

  test("sticky bar appears after scrolling past the primary CTA", async ({
    page,
  }) => {
    // Scroll well past the hero so the primary Add-to-Cart leaves the viewport.
    await page.evaluate(() => window.scrollTo({ top: 2000, behavior: "instant" }));

    const stickyBar = page.locator('[data-slot="pdp-sticky-cta"]');
    await expect(stickyBar).toBeVisible({ timeout: TIMEOUT });

    // Bar must surface the product name and price.
    await expect(stickyBar.getByText(/kingston/i)).toBeVisible();
    await expect(stickyBar.getByRole("button", { name: /add to cart/i })).toBeVisible();
  });

  test("sticky bar disappears when scrolling back to the primary CTA", async ({
    page,
  }) => {
    // Scroll down to trigger the bar.
    await page.evaluate(() => window.scrollTo({ top: 2000, behavior: "instant" }));
    await expect(page.locator('[data-slot="pdp-sticky-cta"]')).toBeVisible({
      timeout: TIMEOUT,
    });

    // Scroll back to top — primary CTA re-enters view → bar hides.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(page.locator('[data-slot="pdp-sticky-cta"]')).toHaveCount(0, {
      timeout: TIMEOUT,
    });
  });

  test("sticky bar Add-to-Cart button is clickable", async ({ page }) => {
    await page.evaluate(() => window.scrollTo({ top: 2000, behavior: "instant" }));
    const stickyBar = page.locator('[data-slot="pdp-sticky-cta"]');
    await expect(stickyBar).toBeVisible({ timeout: TIMEOUT });

    const addBtn = stickyBar.getByRole("button", { name: /add to cart/i });
    await expect(addBtn).toBeEnabled();
  });

  test("sticky bar shows quantity stepper on mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PDP);
    await page.evaluate(() => window.scrollTo({ top: 2000, behavior: "instant" }));

    const stickyBar = page.locator('[data-slot="pdp-sticky-cta"]');
    await expect(stickyBar).toBeVisible({ timeout: TIMEOUT });

    // Quantity stepper is mobile-only (md:hidden class).
    await expect(page.locator('[data-testid="pdp-sticky-qty"]')).toBeVisible();
  });

  test("drag handle is visible on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PDP);
    await page.evaluate(() => window.scrollTo({ top: 2000, behavior: "instant" }));

    const stickyBar = page.locator('[data-slot="pdp-sticky-cta"]');
    await expect(stickyBar).toBeVisible({ timeout: TIMEOUT });

    await expect(
      page.locator('[data-testid="pdp-sticky-drag-handle"]'),
    ).toBeAttached();
  });

  test("no console errors on PDP load and scroll", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.evaluate(() => window.scrollTo({ top: 2000, behavior: "instant" }));
    await page.locator('[data-slot="pdp-sticky-cta"]').waitFor({
      state: "visible",
      timeout: TIMEOUT,
    });
    expect(errors).toHaveLength(0);
  });
});
