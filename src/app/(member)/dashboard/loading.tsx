import { Skeleton } from "@/components/ui/skeleton";

// cfw-tov: loading skeleton covering /dashboard, /dashboard/orders,
// /dashboard/profile, /dashboard/wishlist, /dashboard/preferences.
// Each dashboard page runs async Wix Members + Wix Stores reads and
// is force-dynamic, so without this skeleton tab navigation feels
// stalled.
//
// Layout mirrors DashboardShell: dashboard header (eyebrow + h1
// 'Welcome back, ...' + email), tab nav row (5 tabs — Overview /
// Orders / Wishlist / Profile / Preferences), and a content body.

const TAB_COUNT = 5;
const CONTENT_BLOCK_COUNT = 4;

export default function DashboardLoading() {
  return (
    <main
      data-testid="dashboard-loading"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <header className="mb-8 flex flex-col gap-2 border-b border-cf-divider pb-6">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-8 w-72 rounded sm:h-9" />
        <Skeleton className="h-3 w-56 rounded" />
      </header>

      <nav
        data-slot="dashboard-loading-tabs"
        className="mb-8 flex flex-wrap gap-1 border-b border-cf-divider"
      >
        {Array.from({ length: TAB_COUNT }).map((_, i) => (
          <Skeleton key={i} className="mx-4 my-3 h-4 w-20 rounded" />
        ))}
      </nav>

      <section
        data-slot="dashboard-loading-body"
        className="grid gap-6 md:grid-cols-2"
      >
        {Array.from({ length: CONTENT_BLOCK_COUNT }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-lg border border-cf-divider p-6"
          >
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-3/4 rounded" />
            <Skeleton className="mt-3 h-9 w-32 rounded" />
          </div>
        ))}
      </section>
    </main>
  );
}
