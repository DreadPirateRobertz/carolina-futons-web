import { Skeleton } from "@/components/ui/skeleton";

// cfw-p9u: rendered by Next during async resolution of /wishlist.
// The page is force-dynamic + member-gated; once authenticated it
// runs getWishlist (Velo round-trip + Wix Stores fetch per saved
// item). Without this skeleton the member saw a blank page during
// the round-trip.
//
// Layout mirrors WishlistView's populated state: header + N item
// rows. Each row matches the real card shape: thumbnail + title +
// price + qty/Add-to-cart button column.

const SKELETON_ROW_COUNT = 5;

export default function WishlistLoading() {
  return (
    <main
      data-testid="wishlist-loading"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded sm:h-9" />
          <Skeleton className="h-3 w-44 rounded" />
        </div>
        <Skeleton className="h-9 w-32 rounded" />
      </header>

      <ul
        aria-label="Wishlist"
        data-slot="wishlist-loading-list"
        className="mt-8 space-y-4"
      >
        {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
          <li
            key={i}
            className="flex flex-col gap-4 rounded-lg border border-cf-divider bg-white p-4 sm:flex-row sm:items-center"
          >
            <Skeleton className="h-20 w-20 shrink-0 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/3 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20 rounded" />
              <Skeleton className="h-9 w-32 rounded" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
