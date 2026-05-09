/**
 * PDP variant selection E2E spec — cfw-1nm
 *
 * Production observation (Stilgar 2026-05-04): clicking through colors on
 * /products/kingston-futon-frame left the main image src unchanged, and
 * clicking through sizes on a variant-priced product left the price stuck.
 * Root cause was that the Wix Stores v1 schema attaches per-choice media to
 * productOptions[*].choices[*].media (not on the Variant), and that
 * priceData.formatted is not always populated per variant — the helpers
 * needed to read both real shapes.
 *
 * Tests use fixture mode so the catalog shape is stable across CI runs.
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/pdp-variant-selection.spec.ts
 */

import { test, expect } from "@playwright/test";

const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

test.describe("PDP variant selection (cfw-1nm)", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");

  test("(1) selecting a different color swaps the main gallery image", async ({
    page,
  }) => {
    await page.goto("/products/kingston-futon-frame");
    const mainImg = page.getByTestId("pdp-main-image").first();
    await expect(mainImg).toBeVisible();

    const initialSrc = await mainImg.getAttribute("src");
    expect(initialSrc).toBeTruthy();

    // Pick the non-default color (Espresso).
    await page
      .getByRole("radio", { name: /frame color: espresso/i })
      .click();

    // Wait for src change — view-transition / framer crossfade can take a tick.
    await expect
      .poll(async () => mainImg.getAttribute("src"), { timeout: 5000 })
      .not.toBe(initialSrc);
  });

  test("(2) selecting a different size updates the displayed price", async ({
    page,
  }) => {
    // monterey-platform-bed has Queen ($1,699) and King ($1,899) variants.
    await page.goto("/products/monterey-platform-bed");

    const price = page.getByTestId("variant-price").first();
    await expect(price).toBeVisible();
    const queenText = await price.textContent();
    expect(queenText).toMatch(/\$1,?699/);

    await page.getByRole("radio", { name: /size: king/i }).click();
    await expect(price).toContainText(/\$1,?899/);
  });

  // cfw-dnf: bug acceptance criterion is "verified on /products/kingston-futon-frame"
  // for BOTH bugs. The original cfw-1nm fix is verified on Monterey for size→price,
  // but the bead specifically calls out Kingston's price stuck at $619 across Full/
  // Queen/King. Pin a Kingston-specific assertion here so a regression on the
  // production-shape catalog (Frame Color × Size with distinct per-size prices)
  // fails CI immediately.
  test("(2k) Kingston: size selection updates price across Full / Queen / King", async ({
    page,
  }) => {
    await page.goto("/products/kingston-futon-frame");

    const price = page.getByTestId("variant-price").first();
    await expect(price).toBeVisible();
    await expect(price).toContainText(/\$619/);

    await page.getByRole("radio", { name: /size: queen/i }).click();
    await expect(price).toContainText(/\$719/);

    await page.getByRole("radio", { name: /size: king/i }).click();
    await expect(price).toContainText(/\$819/);
  });

  test("(3) cart line carries the selected variant's price", async ({
    page,
  }) => {
    await page.goto("/products/monterey-platform-bed");
    await page.getByRole("radio", { name: /size: king/i }).click();
    await expect(page.getByTestId("variant-price")).toContainText(
      /\$1,?899/,
    );
    await page.getByRole("button", { name: /add to cart/i }).first().click();
    // Cart drawer opens optimistically; the line price is the variant unit price.
    await expect(page.getByTestId("cart-line-price").first()).toContainText(
      /\$1,?899/,
    );
  });
});
