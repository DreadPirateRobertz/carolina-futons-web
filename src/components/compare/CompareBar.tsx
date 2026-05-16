// Singleton mounted in RootLayout. Listens to "cf-compare-change" window events
// dispatched by AddToCompareButton; localStorage is the source of truth. Renders
// only after hydration to avoid SSR/client mismatch (localStorage is client-only).
// z-50 matches CartDrawer overlay stack — stays above page content, below modals.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { COMPARE_MAX, COMPARE_MIN } from "@/lib/product/compare";
import {
  buildCompareUrl,
  getCompareSlugs,
  setCompareSlugs,
} from "@/lib/product/compare-state";

export function CompareBar() {
  // null = not yet hydrated (SSR renders nothing; avoids localStorage/server mismatch)
  const [slugs, setSlugs] = useState<string[] | null>(null);
  // cf-369: hide the bar on /compare itself — the page already renders the
  // comparison, so a floating "Compare" CTA over the table is redundant
  // (and confusing once the user is on the destination URL).
  const pathname = usePathname();

  useEffect(() => {
    const sync = () => setSlugs(getCompareSlugs());
    sync(); // single setState: reads localStorage on first client paint
    window.addEventListener("cf-compare-change", sync);
    return () => window.removeEventListener("cf-compare-change", sync);
  }, []);

  if (slugs === null || slugs.length === 0) return null;
  if (pathname === "/compare") return null;

  const atMax = slugs.length >= COMPARE_MAX;
  const enoughToCompare = slugs.length >= COMPARE_MIN;
  const remainingForMin = COMPARE_MIN - slugs.length;
  const count = slugs.length;
  const countLabel = `${count} item${count === 1 ? "" : "s"}${atMax ? " (max)" : ""}`;

  return (
    <div
      data-testid="compare-bar"
      data-enough-to-compare={enoughToCompare ? "true" : "false"}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <p
          className="text-sm font-medium text-cf-ink"
          aria-live="polite"
          aria-atomic="true"
        >
          <span data-testid="compare-bar-count">{countLabel}</span>
          {" selected for comparison"}
          {!enoughToCompare ? (
            <span
              data-testid="compare-bar-hint"
              className="ml-2 text-xs font-normal text-cf-muted"
            >
              {/* cf-369: tell users why the Compare CTA is muted instead of
                  leaving them to click and discover the "Pick 2-4 products"
                  empty state on /compare. */}
              (add {remainingForMin} more to compare)
            </span>
          ) : null}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="compare-bar-clear"
            aria-label={`Clear ${count} item${count === 1 ? "" : "s"} from comparison`}
            onClick={() => {
              setSlugs([]); // optimistic — UI clears immediately even if localStorage fails
              setCompareSlugs([]);
            }}
            className="text-xs text-cf-muted underline-offset-2 hover:text-cf-ink hover:underline"
          >
            Clear
          </button>
          {enoughToCompare ? (
            <Link
              href={buildCompareUrl(slugs)}
              data-testid="compare-bar-compare-link"
              aria-label={`Compare ${count} selected item${count === 1 ? "" : "s"}`}
              className="rounded-md bg-cf-cta px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
            >
              Compare
            </Link>
          ) : (
            <span
              data-testid="compare-bar-compare-disabled"
              aria-disabled="true"
              className="cursor-not-allowed rounded-md bg-cf-cta/30 px-4 py-2 text-sm font-semibold text-white shadow-sm"
            >
              Compare
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
