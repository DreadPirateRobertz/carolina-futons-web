"use client";

import Link from "next/link";
import type { QuizRecommendation } from "@/lib/wix/style-quiz";

type Props = {
  results: QuizRecommendation[];
  copy: string;
  shareHref?: string;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
};

export function QuizResult({ results, copy, shareHref, headingRef }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 font-source-sans sm:px-6">
      <header className="mb-10 space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
          Your results
        </p>
        <h1
          ref={headingRef}
          tabIndex={headingRef ? -1 : undefined}
          className="font-playfair text-3xl font-semibold tracking-tight text-cf-ink outline-none sm:text-4xl"
        >
          Your perfect futon matches
        </h1>
        {copy && (
          <p className="max-w-prose text-base leading-relaxed text-cf-muted">
            {copy}
          </p>
        )}
      </header>

      {results.length === 0 ? (
        <div className="space-y-3 text-cf-muted">
          <p>We could not find an exact match right now.</p>
          <Link href="/shop" className="text-cf-cta underline underline-offset-2">
            Browse our full collection
          </Link>
        </div>
      ) : (
        <ul role="list" className="space-y-4">
          {results.map(({ product, reason }) => (
            <li
              key={product._id}
              className="flex items-start gap-4 rounded-lg border border-cf-ink/10 bg-white dark:bg-cf-cream dark:border-cf-ink/30 p-5 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <h2 className="font-playfair text-xl font-semibold text-cf-ink">
                  {product.name}
                </h2>
                <p className="mt-0.5 text-sm text-cf-muted">{reason}</p>
                <p className="mt-2 font-medium text-cf-ink">
                  {product.formattedPrice}
                </p>
                <Link
                  href={`/products/${product.slug}`}
                  className="mt-3 inline-block text-sm font-medium text-cf-cta underline underline-offset-2 hover:text-cf-cta/80"
                >
                  View product &rarr;
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 border-t border-cf-ink/10 pt-8">
        {shareHref && (
          <div className="mb-6 rounded-lg bg-cf-cream/60 px-5 py-4 text-center">
            <p className="mb-2 text-sm font-medium text-cf-ink">
              Share your results
            </p>
            <Link
              href={shareHref}
              className="break-all text-xs text-cf-cta underline underline-offset-2"
            >
              {typeof window !== "undefined"
                ? `${window.location.origin}${shareHref}`
                : shareHref}
            </Link>
          </div>
        )}
        <p className="text-center text-sm text-cf-muted">
          Want to explore more?{" "}
          <Link href="/shop" className="text-cf-cta underline underline-offset-2">
            Browse the full collection
          </Link>
        </p>
      </div>
    </div>
  );
}
