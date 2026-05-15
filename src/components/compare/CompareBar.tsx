"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COMPARE_MAX } from "@/lib/product/compare";
import {
  buildCompareUrl,
  getCompareSlugs,
  setCompareSlugs,
} from "@/lib/product/compare-state";

export function CompareBar() {
  const [slugs, setSlugs] = useState<string[]>(() => getCompareSlugs());

  useEffect(() => {
    const onchange = () => setSlugs(getCompareSlugs());
    window.addEventListener("cf-compare-change", onchange);
    return () => window.removeEventListener("cf-compare-change", onchange);
  }, []);

  if (slugs.length === 0) return null;

  const atMax = slugs.length >= COMPARE_MAX;
  const countLabel = `${slugs.length} item${slugs.length === 1 ? "" : "s"}${atMax ? " (max)" : ""}`;

  return (
    <div
      data-testid="compare-bar"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <p className="text-sm font-medium text-cf-ink dark:text-cf-cream">
          <span data-testid="compare-bar-count">{countLabel}</span>
          {" selected for comparison"}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="compare-bar-clear"
            onClick={() => setCompareSlugs([])}
            className="text-xs text-cf-muted underline-offset-2 hover:text-cf-ink hover:underline dark:hover:text-cf-cream"
          >
            Clear
          </button>
          <Link
            href={buildCompareUrl(slugs)}
            className="rounded-md bg-cf-cta px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
          >
            Compare
          </Link>
        </div>
      </div>
    </div>
  );
}
