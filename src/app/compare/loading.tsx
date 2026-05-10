import { Skeleton } from "@/components/ui/skeleton";

// cfw-gr4: rendered by Next during async resolution of /compare.
// The page is force-dynamic and runs up to COMPARE_MAX (4) parallel
// getProductBySlug calls — without loading.tsx visitors see a blank
// page during the round-trips.
//
// Layout mirrors the real page: eyebrow + h1 + subhead, then a
// 4-column comparison-table-shaped skeleton — header row of product
// thumbnails + 8 attribute rows.

const SKELETON_COLUMN_COUNT = 4;
const SKELETON_ATTRIBUTE_ROWS = 8;

export default function CompareLoading() {
  return (
    <main
      data-testid="compare-loading"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <header className="mb-6 space-y-2">
        <Skeleton className="h-3 w-44 rounded" />
        <Skeleton className="h-7 w-72 rounded sm:h-8" />
        <Skeleton className="h-4 w-56 rounded" />
      </header>

      <div
        data-slot="compare-loading-table"
        className="overflow-x-auto rounded-lg border border-cf-divider"
      >
        {/* Header row — product thumbnails + names. */}
        <div
          data-slot="compare-loading-header"
          className="grid border-b border-cf-divider"
          style={{
            gridTemplateColumns: `repeat(${SKELETON_COLUMN_COUNT}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: SKELETON_COLUMN_COUNT }).map((_, i) => (
            <div key={i} className="space-y-2 p-4">
              <Skeleton className="aspect-square w-full rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>

        {/* Attribute rows — single skeleton per row spanning all columns. */}
        {Array.from({ length: SKELETON_ATTRIBUTE_ROWS }).map((_, i) => (
          <div
            key={i}
            data-slot="compare-loading-row"
            className="border-b border-cf-divider/60 px-4 py-3 last:border-b-0"
          >
            <Skeleton className="h-4 w-full rounded" />
          </div>
        ))}
      </div>
    </main>
  );
}
