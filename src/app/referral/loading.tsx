import { Skeleton } from "@/components/ui/skeleton";

// cfw-v66: rendered by Next during async resolution of /referral.
// The page is force-dynamic + member-gated; once authenticated it
// runs two parallel server actions (getMyReferralCodeAction +
// getMyReferralStatsAction). Without this skeleton the member sees
// a blank page during the round-trip.
//
// Layout mirrors ReferralDashboard at a high level: heading +
// share-link block (URL + Copy button stand-in) + 3-stat grid
// (total referrals / pending rewards / earned rewards).

export default function ReferralLoading() {
  return (
    <main
      data-testid="referral-loading"
      aria-busy="true"
      aria-live="polite"
      className="w-full min-h-screen bg-cf-cream/30"
    >
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="space-y-3">
          <Skeleton className="h-3 w-44 rounded" />
          <Skeleton className="h-8 w-72 rounded sm:h-10" />
          <Skeleton className="h-4 w-full max-w-md rounded" />
        </header>

        {/* Share-link block — URL field + Copy button. */}
        <div
          data-slot="referral-loading-share"
          className="mt-8 flex flex-wrap gap-3 rounded-lg border border-cf-divider bg-white p-4"
        >
          <Skeleton className="h-10 flex-1 min-w-[12rem] rounded" />
          <Skeleton className="h-10 w-24 rounded" />
        </div>

        {/* 3-stat grid. */}
        <div
          data-slot="referral-loading-stats"
          className="mt-8 grid gap-4 sm:grid-cols-3"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-lg border border-cf-divider bg-white p-5"
            >
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-7 w-16 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
