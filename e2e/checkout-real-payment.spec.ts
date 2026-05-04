/**
 * E2E: Full cart → Wix checkout with real sandbox payment
 * cf-m07g
 *
 * STATUS: Blocked pending:
 *   (a) P0 OAuth — visitor token must survive checkout redirect handoff
 *       (tracked in the P0 auth bead)
 *   (b) Stilgar enabling Wix Payments sandbox mode on the site
 *
 * These tests are gated by CF_E2E_LIVE_CHECKOUT=1. Do NOT set that flag
 * in CI until both blockers are resolved — the suite will otherwise fire
 * real Wix API calls and attempt to create real checkout sessions.
 *
 * Required env vars when running live:
 *   CF_E2E_LIVE_CHECKOUT=1          — enables this suite
 *   E2E_PRODUCT_SLUG                — (optional) PDP slug to use;
 *                                      defaults to "kingston-futon-frame"
 *
 * Run with:
 *   CF_E2E_LIVE_CHECKOUT=1 npx playwright test e2e/checkout-real-payment.spec.ts
 *
 * What this exercises (requires live Wix API + sandbox payments enabled):
 *   1. PDP renders with an enabled Add-to-cart button
 *   2. Add-to-cart creates a Wix cart line (real API call)
 *   3. Cart drawer opens and shows the item + subtotal
 *   4. "Go to checkout" CTA hits GET /checkout → initCheckout()
 *      → redirects to Wix-hosted payment page
 *   5. Wix checkout page loads on its hosted domain
 *   6. Payment form / payment method selection is visible
 *
 * Out of scope (separate bead once sandbox is live):
 *   • Filling in card details and submitting
 *   • Order confirmation page post-payment
 *   • Webhook / order status verification
 */

import { test, expect } from "@playwright/test";

const isLiveMode = process.env.CF_E2E_LIVE_CHECKOUT === "1";

const PRODUCT_SLUG =
  process.env.E2E_PRODUCT_SLUG ?? "kingston-futon-frame";

const PDP_URL = `/products/${PRODUCT_SLUG}`;

// Wix-hosted checkout lands on the site's connected domain or a wix.com
// subdomain. Accept either — the exact host varies by site plan.
const WIX_CHECKOUT_URL_RE =
  /wix\.com|wixapps\.net|carolinafutons\.com\/checkout/i;

const CHECKOUT_TIMEOUT = 30_000;

// ── 1. PDP → add to cart ──────────────────────────────────────────────────────

test.describe("live checkout — PDP + cart", () => {
  test.skip(!isLiveMode, "requires CF_E2E_LIVE_CHECKOUT=1 and sandbox enabled");
  test.setTimeout(60_000);

  test("PDP renders with enabled Add-to-cart button", async ({ page }) => {
    await page.goto(PDP_URL);
    const addBtn = page.locator('button:has-text("Add to cart")');
    await expect(addBtn).toBeVisible({ timeout: CHECKOUT_TIMEOUT });
    await expect(addBtn).toBeEnabled();
  });

  test("add to cart opens drawer with item and subtotal", async ({ page }) => {
    await page.goto(PDP_URL);

    const addBtn = page.locator('button:has-text("Add to cart")');
    await expect(addBtn).toBeEnabled({ timeout: CHECKOUT_TIMEOUT });
    await addBtn.click();

    const drawer = page.locator('[data-testid="cart-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 10_000 });

    // At least one line item present
    const cartLine = page.locator('[data-testid="cart-line"]');
    await expect(cartLine).toHaveCount(1);

    // Subtotal renders (non-zero dollar amount)
    const subtotal = page.locator('[data-testid="cart-subtotal"]');
    await expect(subtotal).toBeVisible();
    await expect(subtotal).toContainText(/\$\d/);

    // Checkout CTA is ready
    const checkoutCta = page.locator('[data-testid="cart-checkout-cta"]');
    await expect(checkoutCta).toBeVisible();
    await expect(checkoutCta).toContainText(/checkout/i);
  });
});

// ── 2. Checkout redirect → Wix-hosted payment page ───────────────────────────

test.describe("live checkout — Wix payment page", () => {
  test.skip(!isLiveMode, "requires CF_E2E_LIVE_CHECKOUT=1 and sandbox enabled");
  test.setTimeout(90_000);

  test("Go to checkout navigates to Wix-hosted checkout page", async ({
    page,
  }) => {
    // Add item to cart
    await page.goto(PDP_URL);
    const addBtn = page.locator('button:has-text("Add to cart")');
    await expect(addBtn).toBeEnabled({ timeout: CHECKOUT_TIMEOUT });
    await addBtn.click();

    const drawer = page.locator('[data-testid="cart-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 10_000 });

    // Click checkout CTA — triggers GET /checkout → Wix redirect
    const checkoutCta = page.locator('[data-testid="cart-checkout-cta"]');
    await expect(checkoutCta).toContainText(/checkout/i, { timeout: 10_000 });
    await checkoutCta.click();

    // /checkout route creates Wix session + 307-redirects to fullUrl.
    // Allow extra time for the Wix API call + redirect chain.
    await page.waitForURL(WIX_CHECKOUT_URL_RE, { timeout: CHECKOUT_TIMEOUT });

    expect(page.url()).toMatch(WIX_CHECKOUT_URL_RE);
  });

  test("Wix checkout page renders payment form", async ({ page }) => {
    // Add item
    await page.goto(PDP_URL);
    const addBtn = page.locator('button:has-text("Add to cart")');
    await expect(addBtn).toBeEnabled({ timeout: CHECKOUT_TIMEOUT });
    await addBtn.click();

    const drawer = page.locator('[data-testid="cart-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 10_000 });

    const checkoutCta = page.locator('[data-testid="cart-checkout-cta"]');
    await expect(checkoutCta).toContainText(/checkout/i, { timeout: 10_000 });
    await checkoutCta.click();

    await page.waitForURL(WIX_CHECKOUT_URL_RE, { timeout: CHECKOUT_TIMEOUT });

    // Wix checkout page should render a payment section.
    // Wix renders payment options in a section labelled "Payment" or shows
    // credit-card / PayPal method buttons. Accept any of these signals.
    const paymentSignal = page
      .locator(
        [
          "text=/payment/i",
          '[data-hook="payment-widget"]',
          'iframe[title*="payment" i]',
          'iframe[name*="payment" i]',
          "text=/credit.*card/i",
          "text=/debit.*card/i",
          "text=/card.*number/i",
        ].join(", "),
      )
      .first();

    await expect(paymentSignal).toBeVisible({ timeout: CHECKOUT_TIMEOUT });
  });

  test("order summary on Wix checkout reflects the cart item", async ({
    page,
  }) => {
    // Add item
    await page.goto(PDP_URL);
    const addBtn = page.locator('button:has-text("Add to cart")');
    await expect(addBtn).toBeEnabled({ timeout: CHECKOUT_TIMEOUT });
    await addBtn.click();

    const drawer = page.locator('[data-testid="cart-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 10_000 });

    const checkoutCta = page.locator('[data-testid="cart-checkout-cta"]');
    await expect(checkoutCta).toContainText(/checkout/i, { timeout: 10_000 });
    await checkoutCta.click();

    await page.waitForURL(WIX_CHECKOUT_URL_RE, { timeout: CHECKOUT_TIMEOUT });

    // Wix checkout order summary should include a dollar amount.
    // We don't assert the exact product name since Wix may truncate it.
    const orderSummary = page.locator("text=/\\$\\d+/").first();
    await expect(orderSummary).toBeVisible({ timeout: CHECKOUT_TIMEOUT });
  });
});

// ── 3. Error recovery ────────────────────────────────────────────────────────

test.describe("live checkout — error recovery", () => {
  test.skip(!isLiveMode, "requires CF_E2E_LIVE_CHECKOUT=1 and sandbox enabled");
  test.setTimeout(30_000);

  test("empty cart redirects /checkout back to /cart with error param", async ({
    page,
  }) => {
    // Navigate directly to /checkout with no cart — initCheckout will fail
    // because there's no current cart. The route should bounce to /cart.
    await page.goto("/checkout");
    await page.waitForURL(/\/cart(\?|$)/, { timeout: CHECKOUT_TIMEOUT });
    expect(page.url()).toContain("/cart");
  });
});
