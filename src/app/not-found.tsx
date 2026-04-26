import Link from "next/link";

import { NotFoundIllustration } from "@/components/illustrations/NotFoundIllustration";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-24 text-center">
      <NotFoundIllustration className="mx-auto mb-6" />
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-cf-cta">
        404
      </p>
      <h1 className="mt-4 font-heading text-3xl font-semibold text-cf-navy">
        Page not found
      </h1>
      <p className="mt-4 text-cf-charcoal/80">
        That URL did not match anything in our catalog.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/shop"
          className="inline-flex h-11 items-center justify-center rounded-md bg-cf-cta px-5 text-sm font-medium text-white transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Browse the shop
        </Link>
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
