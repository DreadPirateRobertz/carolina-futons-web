import Link from "next/link";

import {
  readOwnerAuditLog,
  type AuditLogRow,
} from "@/lib/admin/audit-log";

// cfw-wef (cfw-6qd.1): /admin landing for owner mode. The layout has
// already enforced the `requireOwnerSession` gate, so reaching this
// component is sufficient proof the visitor is an allowlisted owner.
//
// cfw-vtx: replaced the original "up next" placeholder copy with a real
// nav surface now that several sub-beads have shipped. The list below is
// hand-maintained — when a new owner-mode surface lands, add an <AdminCard>
// for it so Brenda doesn't have to memorise URLs.
//
// cfw-f2u: added a "Recent activity" card showing the 5 most recent
// OwnerAuditLog rows. Brenda gets a quick "who did what recently" without
// clicking into /admin/audit. Reuses readOwnerAuditLog with a tight cap.

export const dynamic = "force-dynamic";

const RECENT_ACTIVITY_LIMIT = 5;

type AdminCard = {
  title: string;
  href: string;
  description: string;
};

const SHIPPED_SURFACES: ReadonlyArray<AdminCard> = [
  {
    title: "Browse SiteContent",
    href: "/admin/site-content",
    description:
      "Read-only list of every editable copy key on the site, with current values. Use it to audit what you can change inline.",
  },
  {
    title: "Audit log",
    href: "/admin/audit",
    description:
      "The most recent owner edits across the site — who changed what, before/after, and when. Use it to spot accidental edits or hand a change history to engineering.",
  },
];

const STOREFRONT_AFFORDANCES: ReadonlyArray<{ title: string; description: string }> = [
  {
    title: "Inline pencils on copy",
    description:
      "Visit any storefront page (e.g. the homepage or footer). When owner mode is on, a small pencil sits next to each editable string — click to inline-edit.",
  },
  {
    title: "Inline image replace",
    description:
      "Hover an editable image while owner mode is on; the replace affordance lets you swap the image without leaving the page.",
  },
];

export default async function AdminHomePage() {
  const recent = await readOwnerAuditLog(RECENT_ACTIVITY_LIMIT);

  return (
    <section
      data-slot="admin-home"
      aria-labelledby="admin-home-heading"
      className="rounded-lg border border-cf-divider bg-white p-6 shadow-sm sm:p-8"
    >
      <h1
        id="admin-home-heading"
        className="font-heading text-2xl font-semibold text-cf-espresso"
      >
        Owner mode
      </h1>
      <p className="mt-3 text-cf-charcoal/80">
        You&rsquo;re signed in as a Carolina Futons site owner. From here you
        can browse editable content, jump back to the storefront, or sign out.
      </p>

      <RecentActivity result={recent} />

      <h2
        id="admin-home-tools-heading"
        className="mt-8 font-heading text-base font-semibold uppercase tracking-wide text-cf-charcoal/60"
      >
        Tools
      </h2>
      <ul
        aria-labelledby="admin-home-tools-heading"
        data-testid="admin-home-tools"
        className="mt-3 space-y-3"
      >
        {SHIPPED_SURFACES.map((card) => (
          <li
            key={card.href}
            data-slot="admin-home-card"
            className="rounded-md border border-cf-divider/80 p-4"
          >
            <Link
              href={card.href}
              className="font-medium text-cf-espresso underline-offset-2 hover:underline"
            >
              {card.title}
            </Link>
            <p className="mt-1 text-sm text-cf-charcoal/70">
              {card.description}
            </p>
          </li>
        ))}
      </ul>

      <h2
        id="admin-home-on-site-heading"
        className="mt-8 font-heading text-base font-semibold uppercase tracking-wide text-cf-charcoal/60"
      >
        On the storefront
      </h2>
      <ul
        aria-labelledby="admin-home-on-site-heading"
        data-testid="admin-home-on-site"
        className="mt-3 space-y-3"
      >
        {STOREFRONT_AFFORDANCES.map((item) => (
          <li
            key={item.title}
            data-slot="admin-home-on-site-item"
            className="rounded-md border border-cf-divider/80 p-4"
          >
            <p className="font-medium text-cf-espresso">{item.title}</p>
            <p className="mt-1 text-sm text-cf-charcoal/70">
              {item.description}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm">
        <Link href="/" className="text-cf-cta underline-offset-2 hover:underline">
          ← Back to the storefront
        </Link>
      </p>
    </section>
  );
}

function RecentActivity({
  result,
}: {
  result: Awaited<ReturnType<typeof readOwnerAuditLog>>;
}) {
  return (
    <section
      data-testid="admin-home-recent-activity"
      aria-labelledby="admin-home-recent-heading"
      className="mt-8"
    >
      <div className="flex items-baseline justify-between">
        <h2
          id="admin-home-recent-heading"
          className="font-heading text-base font-semibold uppercase tracking-wide text-cf-charcoal/60"
        >
          Recent activity
        </h2>
        <Link
          href="/admin/audit"
          data-testid="admin-home-recent-view-all"
          className="text-xs font-medium text-cf-cta underline-offset-2 hover:underline"
        >
          View all →
        </Link>
      </div>

      {!result.ok ? (
        <p
          role="alert"
          data-testid="admin-home-recent-error"
          className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          Recent activity unavailable. The OwnerAuditLog collection may not be
          provisioned yet.
        </p>
      ) : result.rows.length === 0 ? (
        <p
          data-testid="admin-home-recent-empty"
          className="mt-3 text-sm text-cf-muted"
        >
          No recent activity.
        </p>
      ) : (
        <ul
          data-testid="admin-home-recent-list"
          className="mt-3 divide-y divide-cf-divider/60 rounded-md border border-cf-divider/80"
        >
          {result.rows.map((row, i) => (
            <RecentRow key={row._id ?? `recent-${i}`} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentRow({ row }: { row: AuditLogRow }) {
  return (
    <li
      data-testid="admin-home-recent-row"
      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2 text-xs"
    >
      <span className="text-cf-muted">{formatTimestamp(row.ts)}</span>
      <span className="text-cf-ink">{row.actorEmail}</span>
      <span
        data-testid="admin-home-recent-action"
        className="inline-flex items-center rounded-full border border-cf-divider px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cf-ink"
      >
        {row.action}
      </span>
      <span className="font-mono text-cf-ink">{row.target}</span>
    </li>
  );
}

function formatTimestamp(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toISOString().slice(0, 16).replace("T", " ") + "Z";
}
