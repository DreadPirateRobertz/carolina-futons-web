import type { Metadata } from "next";
import Link from "next/link";

import { loadSiteContent } from "@/lib/cms/site-content";

// cfw-9m3 (cfw-6qd follow-up): owner reference page for the SiteContent
// collection. Brenda's inline pencils only work on copy strings she can
// recognise — this page lets her audit which keys exist and what each
// currently resolves to. Read-only on purpose: edits go through the
// in-page <EditableText> pencils, not here.
//
// cfw-08k: ?q= URL param + search input filters by case-insensitive
// substring against key OR value. Same shape as cfw-3zk's audit search.
// Useful once the collection grows past one screen.
//
// Auth gate is inherited from /admin/layout.tsx (requireOwnerSession).
// `force-dynamic` matches the layout so the gate's per-request redirect
// behaviour isn't ISR-cached.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SiteContent — Owner Mode",
  robots: { index: false, follow: false },
};

function applyQ(
  rows: ReadonlyArray<{ key: string; value: string }>,
  q: string,
): ReadonlyArray<{ key: string; value: string }> {
  const needle = q.trim().toLowerCase();
  if (needle.length === 0) return rows;
  return rows.filter(
    (r) =>
      r.key.toLowerCase().includes(needle) ||
      r.value.toLowerCase().includes(needle),
  );
}

export default async function AdminSiteContentBrowsePage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const result = await loadSiteContent();
  const allRows = [...result.map.entries()]
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => a.key.localeCompare(b.key));
  const rows = applyQ(allRows, q);
  const filterActive = q.length > 0;

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
            {filterActive
              ? `${rows.length} of ${allRows.length} ${
                  allRows.length === 1 ? "key" : "keys"
                } match`
              : `${rows.length} ${
                  rows.length === 1 ? "key" : "keys"
                } currently available for inline edit.`}
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-cf-espresso underline-offset-2 hover:underline"
        >
          ← Back to owner home
        </Link>
      </header>

      <SearchForm q={q} />

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
        <EmptyState
          hasError={Boolean(result.error)}
          filterActive={filterActive}
        />
      ) : (
        <SiteContentTable rows={rows} />
      )}
    </section>
  );
}

function SearchForm({ q }: { q: string }) {
  return (
    <form
      method="get"
      action="/admin/site-content"
      data-testid="admin-site-content-search"
      className="mt-5 flex flex-wrap items-end gap-3 rounded-md border border-cf-divider bg-cf-cream/40 p-3 text-xs"
    >
      <label className="flex flex-col gap-1">
        <span className="font-medium text-cf-charcoal/70">Search</span>
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="text in key or value"
          data-testid="admin-site-content-search-input"
          className="h-8 w-72 rounded border border-cf-divider bg-white px-2 text-cf-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
        />
      </label>
      <button
        type="submit"
        className="inline-flex h-8 items-center justify-center rounded-md bg-cf-cta px-3 font-medium text-white hover:bg-cf-cta/90"
      >
        Apply
      </button>
      <a
        href="/admin/site-content"
        data-testid="admin-site-content-search-clear"
        className="inline-flex h-8 items-center justify-center px-2 text-cf-muted underline-offset-2 hover:text-cf-ink hover:underline"
      >
        Clear
      </a>
    </form>
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
            <th scope="col" className="py-2 font-medium">
              History
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              // cfw-wy0: stable anchor target so /admin/audit rows can link
              // here via /admin/site-content#row-<key>. scroll-mt-20 keeps
              // the linked-to row clear of the page header on arrival.
              id={`row-${row.key}`}
              data-slot="admin-site-content-row"
              data-key={row.key}
              className="scroll-mt-20 border-b border-cf-divider/60 align-top"
            >
              <td className="py-3 pr-4 font-mono text-xs text-cf-ink">
                {row.key}
              </td>
              <td className="py-3 pr-4 text-cf-charcoal whitespace-pre-wrap break-words">
                {row.value || (
                  <span className="text-cf-muted italic">(empty)</span>
                )}
              </td>
              <td className="py-3 text-xs">
                {/* cfw-9md: jump to /admin/audit pre-filtered to this key.
                    Substring search via cfw-3zk's ?q= param — the key
                    string appears in row.target so an exact-substring
                    match lands every edit to this key (and only this
                    key, since target is namespaced). */}
                <Link
                  href={`/admin/audit?q=${encodeURIComponent(row.key)}`}
                  data-testid="admin-site-content-history-link"
                  data-key={row.key}
                  aria-label={`See edit history for ${row.key}`}
                  className="text-cf-cta underline-offset-2 hover:underline"
                >
                  History →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({
  hasError,
  filterActive,
}: {
  hasError: boolean;
  filterActive: boolean;
}) {
  if (filterActive) {
    return (
      <div
        data-testid="admin-site-content-empty"
        className="mt-6 rounded-md border border-dashed border-cf-divider px-4 py-8 text-center text-sm text-cf-charcoal/70"
      >
        <p className="font-medium text-cf-ink">
          No SiteContent rows match that search.
        </p>
        <p className="mt-2">
          Try a shorter substring, or{" "}
          <Link
            href="/admin/site-content"
            className="text-cf-cta underline-offset-2 hover:underline"
          >
            clear the filter
          </Link>{" "}
          to see all keys.
        </p>
      </div>
    );
  }
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
