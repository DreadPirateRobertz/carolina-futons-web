import { Skeleton } from "@/components/ui/skeleton";

// cfw-vbj: rendered by Next during async resolution of /gift-cards.
// The page runs listGiftCards (Wix Stores) and is server-rendered on
// demand (next build classifies it ƒ). Without loading.tsx the
// visitor sees a blank page during the round-trip.
//
// Layout mirrors the real page: icon + heading row, picker grid
// stand-in, and the redeem note at the bottom.

const SKELETON_CARD_COUNT = 6;

export default function GiftCardsLoading() {
  return (
    <main
      data-testid="gift-cards-loading"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="mb-10 flex items-start gap-4">
        <Skeleton className="mt-1 h-10 w-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-4 w-full max-w-md rounded" />
          <Skeleton className="h-4 w-2/3 max-w-sm rounded" />
        </div>
      </div>

      <div
        data-slot="gift-cards-loading-picker"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/3] w-full rounded-lg" />
        ))}
      </div>

      <div className="mt-12 rounded-lg border border-cf-smoke bg-cf-sand/30 px-5 py-4">
        <Skeleton className="h-4 w-48 rounded" />
        <Skeleton className="mt-2 h-3 w-full rounded" />
        <Skeleton className="mt-1 h-3 w-3/4 rounded" />
      </div>
    </main>
  );
}
