import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { Skeleton } from "@/components/ui/skeleton";

// Rendered by Next during the async PLP page resolution (data fetch from Wix
// + PLP merge). Mirrors the real page chrome — breadcrumb, title, description
// strip — and fills the grid with a dozen SkeletonCards (one full row on lg,
// four rows on sm). 12 is a visual match to pageSize=24/2 and prevents the
// skeleton grid from ever rendering shorter than the real card grid on
// typical category pages.
const SKELETON_CARD_COUNT = 12;

export default function PlpLoading() {
  return (
    <main
      data-slot="plp-loading"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-6xl px-4 py-10"
    >
      <div className="text-sm text-zinc-500">
        <Skeleton className="inline-block h-3 w-24 rounded" />
      </div>

      <header className="mt-4">
        <Skeleton className="h-8 w-60 rounded" />
        <Skeleton className="mt-2 h-3 w-80 rounded" />
      </header>

      <ul
        data-slot="plp-loading-grid"
        className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </ul>
    </main>
  );
}
