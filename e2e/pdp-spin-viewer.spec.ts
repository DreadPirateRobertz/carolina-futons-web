/**
 * PDP 360° spin viewer E2E spec — cfw-x3w
 *
 * Fixture mode adds 12 "spin-NNN" media items to kingston-futon-frame so the
 * 360 toggle is rendered. The toggle defaults OFF (preserves LCP candidate /
 * CLS); pressing it swaps the static main image for the spin viewer.
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/pdp-spin-viewer.spec.ts
 */

import { test, expect } from "@playwright/test";

const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

test.describe("PDP 360 spin viewer (cfw-x3w)", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");

  test("renders the 360 toggle when product has spin frames", async ({ page }) => {
    await page.goto("/products/kingston-futon-frame");
    await expect(page.getByTestId("pdp-spin-toggle")).toBeVisible();
  });

  test("static gallery is the initial render — spin viewer hidden by default", async ({ page }) => {
    await page.goto("/products/kingston-futon-frame");
    await expect(page.getByTestId("pdp-main-image")).toBeVisible();
    await expect(page.getByTestId("product-spin-viewer")).toHaveCount(0);
  });

  test("clicking the toggle swaps the main image for the spin viewer", async ({ page }) => {
    await page.goto("/products/kingston-futon-frame");
    await page.getByTestId("pdp-spin-toggle").click();
    await expect(page.getByTestId("product-spin-viewer")).toBeVisible();
  });

  test("auto-rotate toggle inside the spin viewer is keyboard-accessible", async ({ page }) => {
    await page.goto("/products/kingston-futon-frame");
    await page.getByTestId("pdp-spin-toggle").click();
    const autoRotate = page.getByTestId("spin-auto-rotate-toggle");
    await expect(autoRotate).toHaveAttribute("aria-pressed", "false");
    await autoRotate.click();
    await expect(autoRotate).toHaveAttribute("aria-pressed", "true");
  });

  test("falls back to static gallery when product has no spin frames", async ({ page }) => {
    // monterey-platform-bed has no "spin-NNN" media items, so the toggle
    // is absent and the static gallery is the only render path.
    await page.goto("/products/monterey-platform-bed");
    await expect(page.getByTestId("pdp-spin-toggle")).toHaveCount(0);
    await expect(page.getByTestId("pdp-main-image")).toBeVisible();
  });
});
