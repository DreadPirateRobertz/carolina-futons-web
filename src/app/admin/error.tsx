"use client";

import { useEffect } from "react";
import Link from "next/link";

// cfw-1rb: error boundary scoped to the /admin route group. Without
// this, a thrown error during /admin/* page render falls through to
// the root error boundary (src/app/error.tsx) whose CTAs are 'Try
// again' + '← Back to home (the storefront)' — wrong audience for an
// owner. Replace with the same Try Again reset + a link to /admin
// home so Brenda stays in owner-mode after a transient failure.
//
// Logs to console.error inside useEffect so the existing Sentry
// server-side capture still picks up the digest. The error.digest
// is surfaced in the UI for support-ticket correlation.

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin error boundary]", error);
  }, [error]);

  return (
    <section
      data-slot="admin-error"
      data-testid="admin-error"
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm sm:p-8"
    >
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-red-700">
        Something broke
      </p>
      <h1
        className="mt-3 font-heading text-2xl font-semibold text-cf-espresso"
      >
        That admin page hit an error
      </h1>
      <p className="mt-3 text-sm text-cf-charcoal/80">
        Probably a transient Wix outage. Try again in a moment — if it
        keeps happening, ping engineering with the reference below.
      </p>
      {error.digest ? (
        <p
          data-testid="admin-error-digest"
          className="mt-2 font-mono text-xs text-cf-muted"
        >
          Ref: {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          data-testid="admin-error-retry"
          className="inline-flex h-9 items-center justify-center rounded-md bg-cf-cta px-4 text-sm font-medium text-white transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Try again
        </button>
        <Link
          href="/admin"
          data-testid="admin-error-home-link"
          className="inline-flex h-9 items-center justify-center rounded-md border border-cf-divider bg-white px-4 text-sm font-medium text-cf-ink transition-colors hover:bg-cf-cream/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          ← Owner home
        </Link>
      </div>
    </section>
  );
}
