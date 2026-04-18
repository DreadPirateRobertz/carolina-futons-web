// PLP price formatting for Wix Stores products.
//
// cf-24q: Wix products with `manageVariants: true` (e.g. mattresses with
// Twin/Full/Queen/King pricing) return `priceData.formatted.price = "$0.00"`
// at the product level — the real spread lives on `priceRange.{minValue,maxValue}`
// and the per-variant `variant.priceData`. Rendering `priceData.formatted.price`
// directly shipped "$0.00" on /shop/mattresses (cf-3qt.2 blocker).
//
// This helper chooses the correct display string:
//   - No price data at all                       → ""
//   - Fixed-price product (priceRange absent)    → priceData.formatted.price
//   - Variant range with min === max             → the single price
//   - Variant range with base price $0           → "From $min"
//   - Variant range with a set base price        → "$min – $max"

export type PlpPricedProduct = {
  priceData?: {
    price?: number | null;
    currency?: string | null;
    formatted?: { price?: string | null } | null;
  } | null;
  priceRange?: {
    minValue?: number | null;
    maxValue?: number | null;
  } | null;
};

export function formatPlpPrice(product: PlpPricedProduct): string {
  const baseFormatted = product.priceData?.formatted?.price ?? "";
  const basePrice = product.priceData?.price ?? null;
  const currency = product.priceData?.currency ?? "USD";
  const range = product.priceRange;

  const min = typeof range?.minValue === "number" ? range.minValue : null;
  const max = typeof range?.maxValue === "number" ? range.maxValue : null;
  const hasUsableRange = min !== null && max !== null && max > 0;

  if (hasUsableRange) {
    if (min === max) return formatCurrency(min, currency);
    if (!basePrice || basePrice === 0) {
      return `From ${formatCurrency(min, currency)}`;
    }
    return `${formatCurrency(min, currency)} – ${formatCurrency(max, currency)}`;
  }

  return baseFormatted;
}

function formatCurrency(amount: number, currency: string): string {
  const isWhole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return isWhole ? `$${amount}` : `$${amount.toFixed(2)}`;
  }
}
