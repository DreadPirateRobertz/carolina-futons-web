import type { Metadata } from "next";

import {
  readOwnerAuditLog,
  type AuditLogRow,
} from "@/lib/admin/audit-log";
import {
  applyAuditFilters,
  auditFiltersActive,
  parseAuditFilters,
  type AuditFilters,
} from "@/lib/admin/audit-filters";
import { formatAuditTimestamp } from "@/lib/admin/format";

// cfw-xlv: /admin/audit owner-mode log viewer.
// cfw-ild: ?action= and ?actor= URL filter params + top-of-page form so
// Brenda can narrow a long log without scrolling. Filtering runs in-memory
// over the 100-row read window — small enough that a server-side query
// rewrite isn't worth it.
// cfw-daa: filter logic moved to @/lib/admin/audit-filters so /admin/audit
// (this page) and GET /api/admin/audit/export apply identical narrowing —
// a row hidden in the UI never accidentally lands in a CSV download, and
// vice versa. Adds a "Download CSV" link to the filter form that
// preserves the active filters in its URL.
//
// The /admin layout (cfw-wef) already gates the entire route group via
// requireOwnerSession, so reaching this server component is sufficient
// proof the visitor is an allowlisted owner.
//
// Out of scope (filed as future beads if Brenda asks):
//   - date-range filter
//   - free-text search across before/after
//   - row-level "revert" (the EditableText ↶ icon already covers this
//     for SiteContent edits via cfw-plg)

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audit log — Owner Mode",
  robots: { index: false, follow: false },
};

const ROW_LIMIT = 100;
const ACTION_VALUES = ["edit", "upload", "swap"] as const;

function buildExportHref(filters: AuditFilters): string {
  const params = new URLSearchParams();
  if (filters.action) params.set("action", filters.action);
  if (filters.actor) params.set("actor", filters.actor);
  if (filters.fromRaw) params.set("from", filters.fromRaw);
  if (filters.toRaw) params.set("to", filters.toRaw);
  if (filters.q) params.set("q", filters.q);
  const qs = params.toString();
  return qs ? `/api/admin/audit/export?${qs}` : "/api/admin/audit/export";
}

export default async function AdminAuditPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const filters = parseAuditFilters({
    action: typeof sp.action === "string" ? sp.action : undefined,
    actor: typeof sp.actor === "string" ? sp.actor : undefined,
    from: typeof sp.from === "string" ? sp.from : undefined,
    to: typeof sp.to === "string" ? sp.to : undefined,
    q: typeof sp.q === "string" ? sp.q : undefined,
  });
  const result = await readOwnerAuditLog(ROW_LIMIT);
  const filteredRows =
    result.ok ? applyAuditFilters(result.rows, filters) : [];
  const filtersActive = auditFiltersActive(filters);

  return (
    <section
      data-slot="admin-audit"
      aria-labelledby="admin-audit-heading"
      className="rounded-lg border border-cf-divider bg-white p-6 shadow-sm sm:p-8"
    >
      <h1
        id="admin-audit-heading"
        className="font-heading text-2xl font-semibold text-cf-espresso"
      >
        Audit log
      </h1>
      <p className="mt-2 text-sm text-cf-charcoal/70">
        The {ROW_LIMIT} most recent owner edits, newest first.
      </p>

      <FilterForm filters={filters} />

      {!result.ok ? (
        <p
          role="alert"
          data-testid="admin-audit-error"
          className="mt-6 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          Couldn&rsquo;t load the audit log. The OwnerAuditLog collection may
          not be provisioned yet.
        </p>
      ) : filteredRows.length === 0 ? (
        <p
          data-testid="admin-audit-empty"
          className="mt-6 text-sm text-cf-muted"
        >
          {filtersActive
            ? "No audit entries match those filters."
            : "No audit entries yet."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table
            data-testid="admin-audit-table"
            className="w-full min-w-[640px] border-collapse text-left text-sm"
          >
            <thead>
              <tr className="border-b border-cf-divider text-xs uppercase tracking-[0.08em] text-cf-muted">
                <th scope="col" className="py-2 pr-3 font-medium">When</th>
                <th scope="col" className="py-2 pr-3 font-medium">Who</th>
                <th scope="col" className="py-2 pr-3 font-medium">Action</th>
                <th scope="col" className="py-2 pr-3 font-medium">Target</th>
                <th scope="col" className="py-2 pr-3 font-medium">Before</th>
                <th scope="col" className="py-2 font-medium">After</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <AuditRow key={row._id ?? `row-${i}`} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function FilterForm({ filters }: { filters: AuditFilters }) {
  return (
    <form
      method="get"
      action="/admin/audit"
      data-testid="admin-audit-filters"
      className="mt-5 flex flex-wrap items-end gap-3 rounded-md border border-cf-divider bg-cf-cream/40 p-3 text-xs"
    >
      <label className="flex flex-col gap-1">
        <span className="font-medium text-cf-charcoal/70">Action</span>
        <select
          name="action"
          defaultValue={filters.action ?? ""}
          data-testid="admin-audit-filter-action"
          className="h-8 rounded border border-cf-divider bg-white px-2 text-cf-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
        >
          <option value="">Any</option>
          {ACTION_VALUES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium text-cf-charcoal/70">Actor</span>
        <input
          type="text"
          name="actor"
          defaultValue={filters.actor}
          placeholder="email substring"
          data-testid="admin-audit-filter-actor"
          className="h-8 rounded border border-cf-divider bg-white px-2 text-cf-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium text-cf-charcoal/70">From</span>
        <input
          type="date"
          name="from"
          defaultValue={filters.fromRaw}
          data-testid="admin-audit-filter-from"
          className="h-8 rounded border border-cf-divider bg-white px-2 text-cf-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium text-cf-charcoal/70">To</span>
        <input
          type="date"
          name="to"
          defaultValue={filters.toRaw}
          data-testid="admin-audit-filter-to"
          className="h-8 rounded border border-cf-divider bg-white px-2 text-cf-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium text-cf-charcoal/70">Search</span>
        <input
          type="text"
          name="q"
          defaultValue={filters.q}
          placeholder="text in target / before / after"
          data-testid="admin-audit-filter-q"
          className="h-8 w-56 rounded border border-cf-divider bg-white px-2 text-cf-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
        />
      </label>
      <button
        type="submit"
        className="inline-flex h-8 items-center justify-center rounded-md bg-cf-cta px-3 font-medium text-white hover:bg-cf-cta/90"
      >
        Apply
      </button>
      <a
        href="/admin/audit"
        data-testid="admin-audit-filter-clear"
        className="inline-flex h-8 items-center justify-center px-2 text-cf-muted underline-offset-2 hover:text-cf-ink hover:underline"
      >
        Clear
      </a>
      {/* cfw-daa: CSV download. href is rebuilt from the active filters
          (not from the form's current select/input values) so the link
          always points at the same dataset the page is rendering — a
          mid-edit form value never produces a misleading download. */}
      <a
        href={buildExportHref(filters)}
        data-testid="admin-audit-filter-export"
        className="ml-auto inline-flex h-8 items-center justify-center rounded-md border border-cf-divider bg-white px-3 font-medium text-cf-ink hover:border-cf-cta hover:text-cf-cta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
      >
        Download CSV
      </a>
    </form>
  );
}

function AuditRow({ row }: { row: AuditLogRow }) {
  return (
    <tr
      data-testid="admin-audit-row"
      className="border-b border-cf-divider/60 align-top last:border-b-0"
    >
      <td className="py-2 pr-3 text-xs text-cf-muted">
        {formatAuditTimestamp(row.ts)}
      </td>
      <td className="py-2 pr-3 text-xs text-cf-ink">{row.actorEmail}</td>
      <td className="py-2 pr-3 text-xs">
        <span
          data-testid="admin-audit-action"
          className="inline-flex items-center rounded-full border border-cf-divider px-2 py-0.5 text-[11px] font-medium text-cf-ink"
        >
          {row.action}
        </span>
      </td>
      <td className="py-2 pr-3 text-xs font-mono text-cf-ink">{row.target}</td>
      <td className="py-2 pr-3 text-xs text-cf-charcoal/70">
        <span className="line-clamp-2">{row.before || "—"}</span>
      </td>
      <td className="py-2 text-xs text-cf-ink">
        <span className="line-clamp-2">{row.after || "—"}</span>
      </td>
    </tr>
  );
}

