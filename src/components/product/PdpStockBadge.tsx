import { logWarn } from "@/lib/observability/log";
import {
  getStockBadgeState,
  type StockBadgeInput,
} from "@/lib/product/stock-badge-state";

export type PdpStockBadgeProps = {
  stock: StockBadgeInput | null | undefined;
};

export function PdpStockBadge({ stock }: PdpStockBadgeProps) {
  // Canary: trackInventory=true with a missing inStock field reads as OOS
  // (conservative). Log so Wix-schema drift surfaces instead of rotting.
  if (stock?.trackInventory === true && stock.inStock == null) {
    logWarn("PdpStockBadge", "trackInventory=true with missing inStock — conservative fallback to out_of_stock. Check Wix product.stock schema.");
  }

  const state = getStockBadgeState(stock);
  if (!state) return null;

  if (state === "low_stock") {
    // getStockBadgeState only returns "low_stock" when quantity is a positive
    // number — the ?? 0 fallback is unreachable, kept for TS narrowing only.
    const qty = stock?.quantity ?? 0;
    return (
      <span
        role="status"
        aria-label={`Low stock — ${qty} left`}
        data-stock-state="low_stock"
        className="inline-flex items-center rounded-full bg-cf-warning/10 px-3 py-1 text-xs font-medium text-cf-warning"
      >
        Low stock — {qty} left
      </span>
    );
  }

  const isInStock = state === "in_stock";
  const label = isInStock ? "In stock" : "Out of stock";
  const tone = isInStock
    ? "bg-cf-success/10 text-cf-success"
    : "bg-cf-error/10 text-cf-error";

  // role=status + aria-label: role=status hands the label to assistive tech as
  // a live region. Don't remove aria-label — it's the screen-reader contract.
  return (
    <span
      role="status"
      aria-label={label}
      data-stock-state={state}
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${tone}`}
    >
      {label}
    </span>
  );
}
