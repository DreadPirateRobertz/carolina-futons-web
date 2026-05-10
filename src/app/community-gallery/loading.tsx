import { Skeleton } from "@/components/ui/skeleton";

// cfw-9g6: rendered by Next during async resolution of /community-
// gallery. The page is ISR-cached (revalidate=3600) so cache hits
// serve instantly — this fires on cold cache misses (every hour, plus
// on invalidation) while listCommunityPhotos round-trips Wix Data.
//
// Layout mirrors the page: hero header (eyebrow + h1 + subhead +
// 'Share your photo' button placeholder) and a masonry grid of
// photo-card skeletons with varied aspect ratios — the real grid uses
// CSS columns + break-inside-avoid, so a uniform aspect-square
// skeleton would mis-set expectations. Vary the heights to evoke the
// real layout's rhythm.

const SKELETON_HEIGHTS = [
  "h-72", "h-56", "h-80", "h-60", "h-64", "h-72",
  "h-56", "h-80", "h-64", "h-72", "h-56", "h-80",
];

export default function CommunityGalleryLoading() {
  return (
    <main
      data-testid="community-gallery-loading"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="mx-auto max-w-7xl space-y-12">
        <header className="mx-auto max-w-[65ch] space-y-3">
          <Skeleton className="h-3 w-44 rounded" />
          <Skeleton className="h-10 w-3/4 rounded sm:h-12" />
          <Skeleton className="h-5 w-full rounded" />
          <Skeleton className="h-5 w-5/6 rounded" />
          <Skeleton className="mt-2 h-10 w-44 rounded-lg" />
        </header>

        <div
          data-slot="community-gallery-loading-grid"
          className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4"
        >
          {SKELETON_HEIGHTS.map((h, i) => (
            <Skeleton
              key={i}
              className={`mb-4 w-full break-inside-avoid rounded-lg ${h}`}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
