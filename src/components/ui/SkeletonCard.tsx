import { Skeleton } from "@/components/ui/skeleton";

// Pulse placeholder that mirrors ProductCard's visible structure: square
// image on top, title row, and a price row underneath. Dimensions follow
// ProductCard's layout (aspect-square image, p-4 body) so the LCP doesn't
// shift when the real card hydrates over it. Rendered inside the same
// <ul> grid as ProductCard, so the outer element is an <li>.
export function SkeletonCard() {
  return (
    <li
      data-slot="skeleton-card"
      aria-hidden="true"
      className="relative overflow-hidden rounded-lg border border-zinc-200 shadow-sm"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-t-lg bg-zinc-100">
        <Skeleton
          data-slot="skeleton-card-image"
          className="absolute inset-0 h-full w-full rounded-none"
        />
      </div>
      <div className="p-4">
        <Skeleton
          data-slot="skeleton-card-title"
          className="h-4 w-3/4 rounded"
        />
        <Skeleton
          data-slot="skeleton-card-price"
          className="mt-2 h-3 w-1/3 rounded"
        />
      </div>
    </li>
  );
}
