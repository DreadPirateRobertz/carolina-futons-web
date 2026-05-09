import Link from "next/link";

// cfw-pxi: admin-themed 404 for owner mistakes (e.g. typo'd URL like
// /admin/aduit). Without this, Next.js falls through to the global
// src/app/not-found.tsx which offers "Browse the shop" and "Back to
// home" — neither is what an owner needs. Replace with links to the
// surfaces an owner is likely trying to reach.
//
// Auth gate is inherited from /admin/layout.tsx (requireOwnerSession) —
// the route group's layout runs before this page, so an unauthenticated
// visitor still gets redirected to /account first. By the time this
// page renders we know the visitor is an allowlisted owner.

export default function AdminNotFound() {
  return (
    <section
      data-slot="admin-not-found"
      aria-labelledby="admin-not-found-heading"
      className="rounded-lg border border-cf-divider bg-white p-6 shadow-sm sm:p-8"
    >
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-cf-cta">
        404
      </p>
      <h1
        id="admin-not-found-heading"
        className="mt-3 font-heading text-2xl font-semibold text-cf-espresso"
      >
        That admin page doesn&rsquo;t exist
      </h1>
      <p className="mt-3 text-sm text-cf-charcoal/70">
        Probably a typo in the URL. Here&rsquo;s where you might have been
        headed:
      </p>
      <ul
        data-testid="admin-not-found-links"
        className="mt-6 grid gap-3 sm:grid-cols-2"
      >
        <li>
          <Link
            href="/admin"
            className="block rounded-md border border-cf-divider/80 p-4 transition-colors hover:border-cf-cta hover:bg-cf-cream/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
          >
            <span className="font-medium text-cf-espresso">Owner home</span>
            <span className="mt-1 block text-xs text-cf-charcoal/70">
              Recent activity + tools list.
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/site-content"
            className="block rounded-md border border-cf-divider/80 p-4 transition-colors hover:border-cf-cta hover:bg-cf-cream/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
          >
            <span className="font-medium text-cf-espresso">
              Browse SiteContent
            </span>
            <span className="mt-1 block text-xs text-cf-charcoal/70">
              Every editable copy key on the site.
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/audit"
            className="block rounded-md border border-cf-divider/80 p-4 transition-colors hover:border-cf-cta hover:bg-cf-cream/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
          >
            <span className="font-medium text-cf-espresso">Audit log</span>
            <span className="mt-1 block text-xs text-cf-charcoal/70">
              Who changed what, before/after, and when.
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/"
            className="block rounded-md border border-cf-divider/80 p-4 transition-colors hover:border-cf-cta hover:bg-cf-cream/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
          >
            <span className="font-medium text-cf-espresso">
              Back to the storefront
            </span>
            <span className="mt-1 block text-xs text-cf-charcoal/70">
              Edit copy + images inline via the on-page pencils.
            </span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
