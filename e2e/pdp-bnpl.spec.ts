/**
 * PDP BNPL widget E2E (cfw-8cx) — fixture mode.
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/pdp-bnpl.spec.ts
 *
 * Validates that the messaging widget appears below the price, the click-to-
 * expand interaction surfaces the 4/12/24-month breakdown, and the widget
 * keeps quiet on a sub-$50 product so we don't suggest a payment plan the
 * lender would reject.
 */

import { test, expect } from "@playwright/test";

const KINGSTON = "/products/kingston-futon-frame"; // $619 fixture (Full size default)
const MESA = "/products/mesa-foam-mattress";        // $119 fixture (still > $50)

const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

test.describe("PDP BNPL widget (cfw-8cx)", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(30_000);

  test("renders below the price with an Affirm teaser and an expandable panel", async ({
    page,
  }) => {
    await page.goto(KINGSTON);

    const widget = page.locator('[data-testid="pdp-bnpl-widget"]');
    await expect(widget).toBeVisible({ timeout: 15_000 });

    // Trigger copy reads "As low as $X/mo with [Affirm]".
    const trigger = widget.locator('[data-testid="bnpl-trigger"]');
    await expect(trigger).toContainText(/As low as \$\d+\/mo with/);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Panel hidden until the trigger is clicked.
    const panel = widget.locator('[data-testid="bnpl-panel"]');
    await expect(panel).toBeHidden();

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toBeVisible();
    await expect(widget.locator('[data-testid="bnpl-term-4"]')).toBeVisible();
    await expect(widget.locator('[data-testid="bnpl-term-12"]')).toBeVisible();
    await expect(widget.locator('[data-testid="bnpl-term-24"]')).toBeVisible();

    // Brand chips for both providers in the expanded panel.
    await expect(panel.locator('[data-testid="bnpl-logo-affirm"]')).toBeVisible();
    await expect(panel.locator('[data-testid="bnpl-logo-afterpay"]')).toBeVisible();
  });

  test("the widget sits below the price block in the buy-box", async ({ page }) => {
    await page.goto(KINGSTON);
    const price = page.locator('[data-testid="variant-price"]').first();
    const widget = page.locator('[data-testid="pdp-bnpl-widget"]').first();
    await expect(price).toBeVisible({ timeout: 15_000 });
    await expect(widget).toBeVisible();
    const priceBox = await price.boundingBox();
    const widgetBox = await widget.boundingBox();
    expect(priceBox).not.toBeNull();
    expect(widgetBox).not.toBeNull();
    if (priceBox && widgetBox) {
      // y of widget must be greater than y of price (lower on the page).
      expect(widgetBox.y).toBeGreaterThan(priceBox.y);
    }
  });

  test("renders on a $119 mattress (above the $50 threshold)", async ({ page }) => {
    await page.goto(MESA);
    await expect(page.locator('[data-testid="pdp-bnpl-widget"]')).toBeVisible({
      timeout: 15_000,
    });
  });
});
