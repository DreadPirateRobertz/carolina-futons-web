export type StockBadgeInput = {
  trackInventory?: boolean | null;
  inStock?: boolean | null;
  quantity?: number | null;
};

export type StockBadgeState = "in_stock" | "low_stock" | "out_of_stock" | null;

// Low-stock threshold — show "N left" amber badge when quantity is at or below.
const LOW_STOCK_THRESHOLD = 5;

/**
 * Derive the PDP stock-badge state from Wix product-level stock.
 *
 * Truth table:
 * - `{trackInventory: true,  inStock: true,  1 ≤ quantity ≤ 5}`   → `"low_stock"`
 * - `{trackInventory: true,  inStock: true,  quantity > 5 or null}` → `"in_stock"`
 * - `{trackInventory: true,  inStock: true,  quantity <= 0}`        → `"out_of_stock"`
 * - `{trackInventory: true,  inStock: false | null | undefined}`    → `"out_of_stock"`
 * - `{trackInventory: false, inStock: *}` → `null` (no chip — untracked item)
 * - missing / null stock → `null` (no chip — no claim)
 *
 * Untracked items (`trackInventory=false` or missing) claim no state — they
 * may be made-to-order, digital, or otherwise not inventoried. Conservative:
 * `trackInventory=true` with missing/null `inStock` reads as `"out_of_stock"`.
 * `quantity <= 0` is also treated as OOS — Wix may not update the `inStock`
 * flag synchronously during oversell reconciliation.
 */
export function getStockBadgeState(
  stock: StockBadgeInput | null | undefined,
): StockBadgeState {
  if (!stock) return null;
  if (!stock.trackInventory) return null;
  if (!stock.inStock) return "out_of_stock";
  // quantity <= 0 (zero or oversell-negative) is OOS regardless of the inStock flag,
  // which Wix may not update synchronously. Conservative over "Low stock — 0 left".
  if (typeof stock.quantity === "number" && stock.quantity <= 0) return "out_of_stock";
  if (typeof stock.quantity === "number" && stock.quantity <= LOW_STOCK_THRESHOLD) {
    return "low_stock";
  }
  return "in_stock";
}
