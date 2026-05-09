import type { Metadata } from "next";

import { requireOwnerSession } from "@/lib/auth/owner";

// cfw-wef (cfw-6qd.1): nested layout for the entire /admin route group.
// Re-runs the owner gate on every request so child routes don't have to
// each call `requireOwnerSession` themselves. force-dynamic disables ISR
// since the gate's redirect behaviour depends on per-request cookies.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Owner Mode — Carolina Futons",
  // Don't expose the admin surface to crawlers — it's gated server-side
  // anyway, but `noindex` prevents Google from indexing the redirect.
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Calls redirect() on the no-session and non-owner paths — control returns
  // here only for an authenticated owner.
  const owner = await requireOwnerSession();

  return (
    <div data-slot="admin-shell" className="min-h-[60vh] bg-cf-cream">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header
          data-slot="admin-shell-header"
          className="flex flex-wrap items-center justify-between gap-3 border-b border-cf-divider pb-4"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cf-cta">
              Owner mode
            </p>
            <p className="mt-1 text-sm text-cf-charcoal/80">
              Signed in as <span data-testid="admin-owner-email">{owner.email}</span>
            </p>
          </div>
          <SignOutForm />
        </header>
        <main className="mt-8">{children}</main>
      </div>
    </div>
  );
}

// Plain HTML form so sign-out works without client JS — DELETE /api/auth/session
// returns JSON, but we POST through this small form to a thin server action so
// the layout doesn't need to be a client component. The action redirects back
// to / after clearing the session.
function SignOutForm() {
  return (
    <form action="/api/admin/sign-out" method="post">
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-md border border-cf-divider px-4 text-sm font-medium text-cf-ink transition-colors hover:bg-cf-cream/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Sign out
      </button>
    </form>
  );
}
