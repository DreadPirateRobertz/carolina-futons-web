// Variant-aware low-stock urgency cue. Renders only in the narrow window
// 1 ≤ quantity ≤ LOW_STOCK_THRESHOLD; the out-of-stock and generic
// in-stock states are owned by PdpStockBadge so the two badges never both
// claim the same visual slot. cfw-6bp.

const LOW_STOCK_THRESHOLD = 5;

export interface ProductInventoryBadgeProps {
  /** Wix Stores stockStatus.quantity for the selected variant (or product). */
  quantity: number | null | undefined;
}

export function ProductInventoryBadge({ quantity }: ProductInventoryBadgeProps) {
  if (typeof quantity !== "number") return null;
  if (!Number.isFinite(quantity)) return null;
  // Out-of-stock has its own badge — staying silent here prevents double-claim.
  if (quantity <= 0) return null;
  if (quantity > LOW_STOCK_THRESHOLD) return null;

  const label = `Only ${quantity} left in stock`;
  return (
    <span
      role="status"
      aria-label={label}
      data-slot="product-inventory-badge"
      className="inline-flex items-center rounded-full bg-cf-warning/10 px-3 py-1 text-xs font-medium text-cf-warning"
    >
      {label}
    </span>
  );
}
