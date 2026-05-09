import type { Metadata } from "next";

import {
  readOwnerAuditLog,
  type AuditLogRow,
} from "@/lib/admin/audit-log";

// cfw-xlv (cfw-6qd.11 follow-up): /admin/audit owner-mode log viewer.
//
// Renders the most recent N rows from OwnerAuditLog newest-first so Brenda
// (and engineering) can see what was edited, by whom, and when. The
// /admin layout (cfw-wef) already gates the entire route group via
// requireOwnerSession, so reaching this server component is sufficient
// proof the visitor is an allowlisted owner.
//
// Out of scope (filed as future beads if Brenda asks):
//   - filtering by date / key / actor
//   - CSV export
//   - row-level "revert" (the EditableText ↶ icon already covers this
//     for SiteContent edits via cfw-plg)

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audit log — Owner Mode",
  robots: { index: false, follow: false },
};

const ROW_LIMIT = 100;

export default async function AdminAuditPage() {
  const result = await readOwnerAuditLog(ROW_LIMIT);

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

      {!result.ok ? (
        <p
          role="alert"
          data-testid="admin-audit-error"
          className="mt-6 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          Couldn&rsquo;t load the audit log. The OwnerAuditLog collection may
          not be provisioned yet.
        </p>
      ) : result.rows.length === 0 ? (
        <p
          data-testid="admin-audit-empty"
          className="mt-6 text-sm text-cf-muted"
        >
          No audit entries yet.
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
              {result.rows.map((row, i) => (
                <AuditRow key={row._id ?? `row-${i}`} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AuditRow({ row }: { row: AuditLogRow }) {
  return (
    <tr
      data-testid="admin-audit-row"
      className="border-b border-cf-divider/60 align-top last:border-b-0"
    >
      <td className="py-2 pr-3 text-xs text-cf-muted">
        {formatTimestamp(row.ts)}
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

function formatTimestamp(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  // ISO with a space + minute precision. Avoids pulling in a date lib;
  // owners are reading "what changed when" not "millisecond precision."
  return new Date(ms).toISOString().slice(0, 16).replace("T", " ") + "Z";
}
