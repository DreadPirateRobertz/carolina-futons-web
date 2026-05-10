import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

// cfw-fpv: rendered by Next during async resolution of the home page.
// Home does ~9 Wix calls (4× getCollectionBySlug, 4× listProducts by
// collection, enrichProductsWithColorChoices) and is force-dynamic, so
// an in-app navigation TO home (PDP back-link, footer wordmark, mobile
// menu Home item) waits silently while those resolve. Cold loads hit
// SSR directly and don't see this; in-app nav benefits from the
// skeleton flash.
//
// Layout mirrors the visually-dominant filter-first section: an intro
// header (uppercase eyebrow + h1 + subhead) and a 2/3/4-column grid
// with 8 SkeletonCards (one full row on lg, four rows on sm). Below-
// fold sections (testimonials, blog teasers, etc.) aren't part of the
// initial paint and don't need skeleton placeholders here.

const SKELETON_CARD_COUNT = 8;

export default function HomeLoading() {
  return (
    <main
      data-slot="home-loading"
      data-testid="home-loading"
      aria-busy="true"
      aria-live="polite"
    >
      <section className="mx-auto w-full max-w-7xl px-4 pb-6 pt-14 sm:px-6 lg:px-8">
        <Skeleton className="h-3 w-44 rounded" />
        <Skeleton className="mt-3 h-12 w-3/4 rounded sm:h-16 lg:h-20" />
        <Skeleton className="mt-4 h-4 w-full max-w-xl rounded" />
        <Skeleton className="mt-2 h-4 w-2/3 max-w-md rounded" />

        {/* Filter-chip stand-in row (matches the FilterFirst chips above
            the product grid). Five circles approximate the four
            category chips + "All" pill. */}
        <div className="mt-8 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-full" />
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <ul
          data-slot="home-loading-grid"
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        >
          {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </ul>
      </section>
    </main>
  );
}
