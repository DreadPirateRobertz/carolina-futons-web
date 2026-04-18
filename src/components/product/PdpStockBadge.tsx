import {
  getStockBadgeState,
  type StockBadgeInput,
} from "@/lib/product/stock-badge-state";

export type PdpStockBadgeProps = {
  stock: StockBadgeInput | null | undefined;
};

export function PdpStockBadge({ stock }: PdpStockBadgeProps) {
  // Canary: trackInventory=true with a missing inStock field reads as OOS
  // (conservative). Log so Wix-schema drift (which would otherwise silently
  // render Out of stock on every tracked product) surfaces instead of rotting.
  if (
    stock &&
    stock.trackInventory === true &&
    (stock.inStock === null || stock.inStock === undefined)
  ) {
    console.warn(
      "[PdpStockBadge] trackInventory=true with missing inStock — conservative fallback to out_of_stock. Check Wix product.stock schema.",
    );
  }

  const state = getStockBadgeState(stock);
  if (!state) return null;

  const label = state === "in_stock" ? "In stock" : "Out of stock";
  const tone =
    state === "in_stock"
      ? "bg-cf-success/10 text-cf-success"
      : "bg-cf-error/10 text-cf-error";

  // role=status + redundant-looking aria-label is deliberate: role=status
  // hands the label to assistive tech as a live region announcement, which
  // some screen readers skip when the accessible name comes only from the
  // visible text. Don't "clean up" the aria-label — it's the SR contract.
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
