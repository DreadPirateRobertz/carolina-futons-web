import type { Metadata } from "next";
import Link from "next/link";

import { loadSiteContent } from "@/lib/cms/site-content";

// cfw-9m3 (cfw-6qd follow-up): owner reference page for the SiteContent
// collection. Brenda's inline pencils only work on copy strings she can
// recognise — this page lets her audit which keys exist and what each
// currently resolves to. Read-only on purpose: edits go through the
// in-page <EditableText> pencils, not here.
//
// Auth gate is inherited from /admin/layout.tsx (requireOwnerSession).
// `force-dynamic` matches the layout so the gate's per-request redirect
// behaviour isn't ISR-cached.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SiteContent — Owner Mode",
  robots: { index: false, follow: false },
};

export default async function AdminSiteContentBrowsePage() {
  const result = await loadSiteContent();
  const rows = [...result.map.entries()]
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return (
    <section
      data-slot="admin-site-content-browse"
      aria-labelledby="admin-site-content-heading"
      className="rounded-lg border border-cf-divider bg-white p-6 shadow-sm sm:p-8"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1
            id="admin-site-content-heading"
            className="font-heading text-2xl font-semibold text-cf-espresso"
          >
            SiteContent
          </h1>
          <p className="mt-1 text-sm text-cf-charcoal/70">
            {rows.length} {rows.length === 1 ? "key" : "keys"} currently
            available for inline edit.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-cf-espresso underline-offset-2 hover:underline"
        >
          ← Back to owner home
        </Link>
      </header>

      {result.error ? (
        <p
          role="alert"
          data-testid="admin-site-content-error"
          className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900"
        >
          Couldn&rsquo;t load the live SiteContent collection right now —
          showing whatever the cache last knew about. Refresh in a moment to
          retry.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState hasError={Boolean(result.error)} />
      ) : (
        <SiteContentTable rows={rows} />
      )}
    </section>
  );
}

function SiteContentTable({
  rows,
}: {
  rows: ReadonlyArray<{ key: string; value: string }>;
}) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table
        data-testid="admin-site-content-table"
        className="min-w-full text-left text-sm"
      >
        <thead>
          <tr className="border-b border-cf-divider text-xs uppercase tracking-wide text-cf-charcoal/60">
            <th scope="col" className="py-2 pr-4 font-medium">
              Key
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Current value
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              data-slot="admin-site-content-row"
              data-key={row.key}
              className="border-b border-cf-divider/60 align-top"
            >
              <td className="py-3 pr-4 font-mono text-xs text-cf-ink">
                {row.key}
              </td>
              <td className="py-3 pr-4 text-cf-charcoal whitespace-pre-wrap break-words">
                {row.value || (
                  <span className="text-cf-muted italic">(empty)</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ hasError }: { hasError: boolean }) {
  return (
    <div
      data-testid="admin-site-content-empty"
      className="mt-6 rounded-md border border-dashed border-cf-divider px-4 py-8 text-center text-sm text-cf-charcoal/70"
    >
      <p className="font-medium text-cf-ink">
        No SiteContent rows {hasError ? "are visible" : "exist yet"}.
      </p>
      <p className="mt-2">
        Run{" "}
        <code className="rounded bg-cf-cream px-1.5 py-0.5 text-xs">
          npm run provision:site-content
        </code>{" "}
        (cfw-roi) or add rows via the Wix Dashboard → CMS → SiteContent
        collection.
      </p>
    </div>
  );
}
