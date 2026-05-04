/**
 * Checkout smoke test — fixture mode.
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/checkout-smoke.spec.ts
 *
 * What this exercises (no live Wix session required):
 *   • Fixture PDP renders with an enabled Add-to-cart button
 *   • OOS fixture product shows the disabled/notify-me state
 *   • Add-to-cart opens the cart drawer with the item present
 *   • Cart subtotal reflects the item price
 *   • Quantity stepper updates the subtotal client-side
 *   • "Go to checkout" CTA navigates through /checkout → /order-confirmation
 *
 * Fixture products are defined in src/lib/fixtures/products.ts.
 * Fixture cart mode (same env flag) short-circuits addItemAction and
 * GET /checkout so no real Wix API calls are made.
 */

import { test, expect } from "@playwright/test";

// Fixture product slugs — must match src/lib/fixtures/products.ts
const KINGSTON = "/products/kingston-futon-frame";    // $399, in-stock
const SEDONA   = "/products/sedona-futon-frame-oos";  // out-of-stock
const MESA     = "/products/mesa-foam-mattress";      // $119, in-stock

const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

test.describe("checkout smoke — fixture mode", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");

  test.setTimeout(30_000);

  // ── 1. PDP in-stock render ─────────────────────────────────────────────────

  test("fixture PDP shows enabled Add to cart button", async ({ page }) => {
    await page.goto(KINGSTON);

    const addBtn = page.locator('button:has-text("Add to cart")');
    await expect(addBtn).toBeVisible({ timeout: 15_000 });
    await expect(addBtn).toBeEnabled();

    // In-stock PDP must show the status element and must not say "out of stock"
    const status = page.locator("#add-to-cart-status");
    await expect(status).toBeVisible({ timeout: 5_000 });
    await expect(status).not.toContainText(/out of stock/i);
  });

  // ── 2. OOS state ──────────────────────────────────────────────────────────

  test("OOS fixture product shows out-of-stock status", async ({ page }) => {
    await page.goto(SEDONA);

    const status = page.locator("#add-to-cart-status");
    await expect(status).toBeVisible({ timeout: 15_000 });
    await expect(status).toContainText(/out of stock/i);
  });

  // ── 3. Add-to-cart + cart drawer ──────────────────────────────────────────

  test("add to cart opens drawer with item and correct subtotal", async ({
    page,
  }) => {
    await page.goto(KINGSTON);

    const addBtn = page.locator('button:has-text("Add to cart")');
    await expect(addBtn).toBeEnabled({ timeout: 15_000 });
    await addBtn.click();

    // Cart drawer opens optimistically
    const drawer = page.locator('[data-testid="cart-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 5_000 });

    // Line item present
    const cartLine = page.locator('[data-testid="cart-line"]');
    await expect(cartLine).toBeVisible();

    // Subtotal reflects Kingston price ($399)
    const subtotal = page.locator('[data-testid="cart-subtotal"]');
    await expect(subtotal).toContainText("399");

    // Checkout CTA present and shows "Go to checkout" (not "Saving…")
    const checkoutCta = page.locator('[data-testid="cart-checkout-cta"]');
    await expect(checkoutCta).toBeVisible();
    await expect(checkoutCta).toContainText(/checkout/i);
  });

  // ── 4. Quantity stepper ────────────────────────────────────────────────────

  test("cart quantity stepper updates subtotal client-side", async ({
    page,
  }) => {
    await page.goto(MESA);

    const addBtn = page.locator('button:has-text("Add to cart")');
    await expect(addBtn).toBeEnabled({ timeout: 15_000 });
    await addBtn.click();

    const drawer = page.locator('[data-testid="cart-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 5_000 });

    const subtotal = page.locator('[data-testid="cart-subtotal"]');
    await expect(subtotal).toContainText("119");

    // Tap the + button on the first stepper
    const plusBtn = page
      .locator('[data-testid="cart-qty-stepper"]')
      .first()
      .locator("button")
      .last();
    await plusBtn.click();

    // Mesa is $119 — 2× = $238
    const qtyValue = page.locator('[data-testid="cart-qty-value"]').first();
    await expect(qtyValue).toHaveText("2");
    await expect(subtotal).toContainText("238");
  });

  // ── 5. Checkout redirect ───────────────────────────────────────────────────

  test("Go to checkout → /checkout → /order-confirmation in fixture mode", async ({
    page,
  }) => {
    await page.goto(KINGSTON);

    const addBtn = page.locator('button:has-text("Add to cart")');
    await expect(addBtn).toBeEnabled({ timeout: 15_000 });
    await addBtn.click();

    const drawer = page.locator('[data-testid="cart-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 5_000 });

    // Wait for server action to confirm (fixture: instant)
    const checkoutCta = page.locator('[data-testid="cart-checkout-cta"]');
    await expect(checkoutCta).toContainText(/checkout/i, { timeout: 5_000 });
    await checkoutCta.click();

    // /checkout route (fixture mode) 307→ /order-confirmation?orderId=fixture-test-order
    await page.waitForURL(/order-confirmation/, { timeout: 15_000 });
    expect(page.url()).toContain("order-confirmation");
    expect(page.url()).toContain("fixture-test-order");
  });
});
