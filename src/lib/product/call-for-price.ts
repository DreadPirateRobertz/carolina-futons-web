/**
 * cf-pdp-g4 (cf-lc1c G-4): call-for-price guard.
 *
 * Wix Velo's `public/productPageUtils.js#isCallForPrice` treats any price
 * ≤ $1 as a call-for-price placeholder. cf-3pwy F1 documented the
 * `catalogPriceFix.fixCallForPricePlaceholders` migration that
 * deliberately sets `price=0` on call-for-price SKUs to trigger native
 * Pro Gallery "Price unavailable" rendering.
 *
 * cfw operates in cents, so the threshold is 100. Callers should pass
 * the canonical `selectedPriceCents` from `getSelectedPriceCents()`.
 */

/** Inclusive upper bound (cents) below which a product is treated as call-for-price. */
export const CALL_FOR_PRICE_THRESHOLD_CENTS = 100;

/** Customer-facing copy when a SKU is in the call-for-price band. */
export const CALL_FOR_PRICE_TEXT = "Call for current pricing";

/**
 * Returns true when the given price-in-cents falls inside the
 * call-for-price band (≤ $1) or is otherwise non-numeric. Mirrors the
 * Wix Velo `isCallForPrice` boundary so the cfw PDP suppresses cart and
 * swaps the price label the same way the Wix Studio PDP does.
 */
export function isCallForPriceCents(cents: number): boolean {
  if (!Number.isFinite(cents)) return true;
  return cents <= CALL_FOR_PRICE_THRESHOLD_CENTS;
}
