// Bundle discount tiers (applied to combined frame + mattress subtotal).
// Accessories are always full price regardless of bundle.
const BUNDLE_TIERS: ReadonlyArray<{ minTotal: number; discountPct: number }> = [
  { minTotal: 2000, discountPct: 10 },
  { minTotal: 1000, discountPct: 7 },
  { minTotal: 500,  discountPct: 5 },
];

export type BundlePriceSummary = {
  framePrice: number;
  mattressPrice: number;
  accessoriesTotal: number;
  subtotal: number;
  discountPct: number;
  discountAmount: number;
  total: number;
};

export function calcBundlePrice(
  framePrice: number,
  mattressPrice: number,
  accessoriesTotal: number,
): BundlePriceSummary {
  const subtotal = framePrice + mattressPrice;
  const tier = BUNDLE_TIERS.find((t) => subtotal >= t.minTotal);
  const discountPct = tier?.discountPct ?? 0;
  const discountAmount = Math.round(subtotal * (discountPct / 100) * 100) / 100;
  const total = subtotal - discountAmount + accessoriesTotal;

  return {
    framePrice,
    mattressPrice,
    accessoriesTotal,
    subtotal,
    discountPct,
    discountAmount,
    total,
  };
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
