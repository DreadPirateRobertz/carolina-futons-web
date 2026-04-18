"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[root error boundary]", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-24 text-center">
      <h1 className="font-heading text-3xl font-semibold text-cf-navy">
        Something went sideways
      </h1>
      <p className="mt-4 text-cf-charcoal/80">
        We hit an error loading that page. Try again in a moment, or head back
        to the shop.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-cf-charcoal/50">
          Ref: {error.digest}
        </p>
      ) : null}
      <div className="mt-8 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center justify-center rounded-md bg-cf-cta px-5 text-sm font-medium text-white transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-md border border-cf-navy px-5 text-sm font-medium text-cf-navy transition-colors hover:bg-cf-navy hover:text-cf-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
