import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

// cfw-jez: rendered by Next during async resolution of /search?q=…
// The page is force-dynamic and runs two parallel Wix calls
// (searchProducts + searchPosts). Visitors see this skeleton while
// those round-trip — much better than a blank page after they
// pressed Enter.
//
// Layout mirrors the real results page: search header (h1 + "for
// '<query>'" subhead) and a 2/1-column body with product grid on the
// left + article list on the right.

const SKELETON_PRODUCT_COUNT = 6;
const SKELETON_POST_COUNT = 4;

export default function SearchLoading() {
  return (
    <main
      data-testid="search-loading"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16"
    >
      <header className="space-y-3">
        <Skeleton className="h-8 w-32 rounded sm:h-10" />
        <Skeleton className="h-4 w-72 rounded" />
      </header>

      <div
        data-slot="search-loading-body"
        className="mt-10 grid gap-12 lg:grid-cols-[2fr,1fr]"
      >
        <section data-slot="search-loading-products" className="space-y-6">
          <Skeleton className="h-5 w-32 rounded" />
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: SKELETON_PRODUCT_COUNT }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </ul>
        </section>
        <aside data-slot="search-loading-posts" className="space-y-4">
          <Skeleton className="h-5 w-32 rounded" />
          <ul className="space-y-4">
            {Array.from({ length: SKELETON_POST_COUNT }).map((_, i) => (
              <li key={i} className="space-y-1">
                <Skeleton className="h-5 w-5/6 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-3/4 rounded" />
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
