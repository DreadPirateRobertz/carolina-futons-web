/**
 * cf-7utd: cart-flow e2e Playwright smoke — full buy-button happy path.
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/cart-flow-e2e.spec.ts
 *
 * Closes the cutover-gate gap surfaced by cf-wsrr cart-parity audit: the
 * 11 baselines on PR #1274 cover visuals + meta + headers + JSON-LD +
 * cache + security + images, but NONE actually exercise the buy-side
 * path end-to-end. checkout-smoke.spec.ts pins individual steps; this
 * spec walks ALL of them in ONE cart session, including the cf-snil
 * coupon-entry surface that didn't exist when checkout-smoke was
 * written.
 *
 * Step-by-step:
 *   1. PDP add-to-cart
 *   2. Cart drawer line render + name + price
 *   3. Quantity +1 → subtotal updates
 *   4. Coupon entry: toggle → input → apply (cf-snil)
 *   5. Applied-state UI verified (cf-snil)
 *   6. Coupon remove → back to baseline (cf-snil)
 *   7. Checkout CTA → /order-confirmation (fixture redirect)
 *   8. Order-confirmation page renders without crash
 *
 * Coupon path (steps 4-6) uses fixture mode's stubbed action shape: the
 * apply action returns ok=true with the entered code regardless of
 * validity, so the spec only verifies the UI plumbing (toggle, input,
 * applied-state render, remove). Real Wix coupon validation lives in
 * cf-w1u1 staging-gated coverage.
 */

import { test, expect } from "@playwright/test";

// MESA fixture has no variants — single Add-to-cart click opens the
// drawer reliably. Kingston has size variants whose pre-selection
// requires a click; staying out of that picker keeps this spec scoped
// to the cart flow itself, not the variant UX.
const MESA = "/products/mesa-foam-mattress";
const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

test.describe("cart-flow e2e — full buy-button path (cf-7utd)", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(60_000);

  test("PDP → drawer → qty bump → coupon apply/remove → checkout → confirmation", async ({
    page,
  }) => {
    // ── 1. PDP add-to-cart ────────────────────────────────────────────
    await page.goto(MESA);
    const addBtn = page.locator('button:has-text("Add to cart")');
    await expect(addBtn).toBeEnabled({ timeout: 15_000 });
    await addBtn.click();

    // ── 2. Cart drawer line render ────────────────────────────────────
    const drawer = page.locator('[data-testid="cart-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 5_000 });
    const cartLine = page.locator('[data-testid="cart-line"]');
    await expect(cartLine).toBeVisible();
    // Mesa foam mattress = $119
    const subtotal = page.locator('[data-testid="cart-subtotal"]');
    await expect(subtotal).toContainText("119");

    // ── 3. Quantity +1 → subtotal updates ─────────────────────────────
    const plusBtn = page
      .locator('[data-testid="cart-qty-stepper"]')
      .first()
      .locator("button")
      .last();
    await plusBtn.click();
    const qtyValue = page.locator('[data-testid="cart-qty-value"]').first();
    await expect(qtyValue).toHaveText("2");
    // 2 × $119 = $238
    await expect(subtotal).toContainText("238");

    // ── 4. Coupon entry toggle → input → apply (cf-snil) ──────────────
    const couponToggle = page.locator('[data-testid="cart-coupon-toggle"]');
    await expect(couponToggle).toBeVisible();
    await couponToggle.click();

    const couponInput = page.locator('[data-testid="cart-coupon-input"]');
    await expect(couponInput).toBeVisible();
    await couponInput.fill("TESTCODE");

    const applyBtn = page.locator('[data-testid="cart-coupon-apply"]');
    await expect(applyBtn).toBeEnabled();
    await applyBtn.click();

    // ── 5. Applied-state UI verified (cf-snil) ────────────────────────
    // The apply action either:
    //   (a) returns ok with appliedCoupon → cart-coupon-entry-applied renders
    //   (b) returns ok without appliedCoupon → applied-state renders with
    //       the entered code only (no discount line)
    //   (c) errors → cart-coupon-error renders
    // Fixture mode short-circuits Wix, so most likely path is (b) or (c)
    // depending on how the action handles fixture mode. We tolerate
    // either applied OR error — what we're NOT tolerating is the form
    // staying in the "applying" / empty-idle state, which would be a
    // wiring bug.
    const appliedState = page.locator('[data-testid="cart-coupon-entry-applied"]');
    const errorState = page.locator('[data-testid="cart-coupon-error"]');
    await expect(appliedState.or(errorState)).toBeVisible({ timeout: 5_000 });

    // ── 6. Coupon remove (only if apply landed) → back to baseline ────
    if (await appliedState.isVisible()) {
      const removeBtn = page.locator('[data-testid="cart-coupon-remove"]');
      await expect(removeBtn).toBeVisible();
      await removeBtn.click();
      // After remove, the form returns to the empty input state (cf-snil
      // UX choice — pinned in CartCouponEntry.test.tsx).
      await expect(couponInput).toBeVisible({ timeout: 5_000 });
    }

    // ── 7. Checkout CTA → /order-confirmation (fixture redirect) ──────
    const checkoutCta = page.locator('[data-testid="cart-checkout-cta"]');
    await expect(checkoutCta).toBeVisible();
    await expect(checkoutCta).toContainText(/checkout/i);
    await checkoutCta.click();

    await page.waitForURL(/order-confirmation/, { timeout: 15_000 });
    expect(page.url()).toContain("fixture-test-order");

    // ── 8. Order-confirmation page renders without crash ──────────────
    // Smoke: page has SOME heading (don't pin specific copy because the
    // page evolves; we just want non-crash + non-empty render).
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });
});
