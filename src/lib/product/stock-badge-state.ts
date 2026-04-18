export type StockBadgeInput = {
  trackInventory?: boolean | null;
  inStock?: boolean | null;
};

export type StockBadgeState = "in_stock" | "out_of_stock" | null;

/**
 * Derive the PDP stock-badge state from Wix product-level stock.
 *
 * Truth table:
 * - `{trackInventory: true,  inStock: true}`  → `"in_stock"`
 * - `{trackInventory: true,  inStock: false}` → `"out_of_stock"`
 * - `{trackInventory: false, inStock: *}`     → `null` (no chip — untracked item)
 * - missing / null stock                      → `null` (no chip — no claim)
 *
 * Untracked items (`trackInventory=false` or missing) claim no state — they
 * may be made-to-order, digital, or otherwise not inventoried. Conservative:
 * `trackInventory=true` with a missing `inStock` reads as `"out_of_stock"` so
 * we don't promise availability on partial data. The caller can watch that
 * branch as a canary for Wix-schema drift.
 */
export function getStockBadgeState(
  stock: StockBadgeInput | null | undefined,
): StockBadgeState {
  if (!stock) return null;
  if (!stock.trackInventory) return null;
  return stock.inStock ? "in_stock" : "out_of_stock";
}
