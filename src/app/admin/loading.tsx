import { Skeleton } from "@/components/ui/skeleton";

// cfw-zwm: rendered by Next during async resolution of any /admin/*
// page. The /admin layout (cfw-wef) shell stays visible — its
// requireOwnerSession gate is fast (cookie + memberId resolution),
// so the perceptible delay during navigation is the page's Wix Data
// query (audit log read, SiteContent map read). This skeleton fills
// that gap so /admin/audit ↔ /admin/site-content navigation feels
// snappy instead of stalled.
//
// Single skeleton covers every admin page because they all render
// rectangular content blocks of similar shape (heading + optional
// row of secondary controls + a tabular/list body). The exact pixel
// match isn't necessary — what matters is that *something* paints
// during the data fetch.
export default function AdminLoading() {
  return (
    <section
      data-slot="admin-loading"
      data-testid="admin-loading"
      aria-busy="true"
      aria-live="polite"
      className="rounded-lg border border-cf-divider bg-white p-6 shadow-sm sm:p-8"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-3 w-32 rounded" />
      </header>
      <Skeleton className="mt-3 h-3 w-72 rounded" />

      {/* Filter / search row — covers /admin/audit and /admin/site-content
          which both have a top-of-page form. */}
      <div className="mt-5 flex flex-wrap gap-3 rounded-md border border-cf-divider bg-cf-cream/40 p-3">
        <Skeleton className="h-8 w-32 rounded" />
        <Skeleton className="h-8 w-44 rounded" />
        <Skeleton className="h-8 w-20 rounded" />
      </div>

      {/* Body block — covers a table or a card list. */}
      <ul
        data-slot="admin-loading-rows"
        className="mt-6 space-y-3"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <Skeleton className="h-9 w-full rounded" />
          </li>
        ))}
      </ul>
    </section>
  );
}
