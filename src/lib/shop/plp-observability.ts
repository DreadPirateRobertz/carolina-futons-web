// PLP observability. One event-kind for now — over-paginated render — but
// kept in its own module so the next PLP diagnostic event (e.g. filter-match
// collapse, facet-drift) can land alongside without growing page.tsx.
//
// Level is "info" on purpose: over-pagination is a user navigation state, not
// a fault. A spike is interesting (stale external links, Googlebot crawling
// beyond last page, or a pagination-link-generator bug) but no single render
// is alertable.
import * as Sentry from "@sentry/nextjs";

export type OverPaginatedContext = {
  categorySlug: string;
  pageNum: number;
  pageTotal: number;
  pageSize: number;
};

/**
 * Emits a structured Sentry event + console.info when an over-paginated PLP
 * render is produced (pageNum beyond the last filled page). The `lastPage`
 * field is derived — callers pass raw page/size/total so the helper is the
 * single source of that arithmetic.
 *
 * Fire-and-forget. Does NOT await Sentry.flush — info-level events are not
 * worth blocking SSR response for. Sentry batches and flushes opportunistically
 * on the Vercel runtime.
 */
export function logOverPaginatedRender(ctx: OverPaginatedContext): void {
  const lastPage = Math.max(1, Math.ceil(ctx.pageTotal / ctx.pageSize));
  const extra = { ...ctx, lastPage };
  console.info("[plp-page] over-paginated render", extra);
  Sentry.captureMessage("plp-page over-paginated render", {
    level: "info",
    tags: {
      source: "plp-page",
      op: "over-paginated",
      categorySlug: ctx.categorySlug,
    },
    extra,
  });
}
