import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

// cfw-pco: rendered by Next during async resolution of /wishlist-share/
// <token>. The page is force-dynamic and runs getSharedWishlist
// (HMAC-token validation + Wix Stores fetch per saved item). Without
// this skeleton the recipient sees a blank page when clicking a
// shared link.
//
// Layout mirrors the real shared-wishlist view: header (h1 + 'N items
// saved' subhead) + 1/2/3-column product card grid.

const SKELETON_CARD_COUNT = 6;

export default function SharedWishlistLoading() {
  return (
    <main
      data-testid="shared-wishlist-loading"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto max-w-4xl px-4 py-10"
    >
      <header className="mb-8">
        <Skeleton className="h-7 w-56 rounded" />
        <Skeleton className="mt-2 h-3 w-32 rounded" />
      </header>

      <ul
        role="list"
        data-slot="shared-wishlist-loading-grid"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
      >
        {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </ul>
    </main>
  );
}
