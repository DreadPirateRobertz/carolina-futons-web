"use client";

// cf-1imv: sticky bottom-anchored bar that surfaces the compare-queue from
// localStorage so users get persistent feedback after tapping "Compare"
// on a PDP/PLP card. Without this, the selection is invisible and the
// /compare page has no discovery affordance.
//
// State source: localStorage via getCompareSlugs() — same single source
// of truth that AddToCompareButton + CompareTable read. Subscribes to
// the "cf-compare-change" window event so it stays in sync with any
// button on the page that toggles a slug.

import { AnimatePresence, m } from "framer-motion";
import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  buildCompareUrl,
  getCompareSlugs,
  setCompareSlugs,
} from "@/lib/product/compare-state";

export function CompareBar() {
  // Lazy initializer hydrates from localStorage without an extra render.
  // getCompareSlugs() guards window access so SSR sees an empty list and
  // the bar is hidden on first paint (no layout shift on hydration).
  const [slugs, setSlugs] = useState<string[]>(() => getCompareSlugs());

  useEffect(() => {
    const onchange = () => setSlugs(getCompareSlugs());
    window.addEventListener("cf-compare-change", onchange);
    return () => window.removeEventListener("cf-compare-change", onchange);
  }, []);

  const count = slugs.length;
  const visible = count > 0;

  const handleClear = () => {
    setCompareSlugs([]);
    // Local state will update via the dispatched cf-compare-change event,
    // but set immediately so the exit animation runs against fresh state.
    setSlugs([]);
  };

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          key="compare-bar"
          data-slot="compare-bar"
          role="region"
          aria-label="Compare queue"
          initial={{ y: 64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 64, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          // BackToTop sits at z-40 bottom-right; this bar spans the full
          // bottom edge at z-30 so the BackToTop button stays clickable
          // above the bar when both are visible.
          className="fixed inset-x-0 bottom-0 z-30 border-t border-cf-divider bg-white shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.15)] dark:bg-cf-cream dark:border-cf-ink/30"
        >
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="text-sm font-medium text-cf-ink">
              {/* Use plural-aware copy without depending on Intl plural
                  rules — count is 1..COMPARE_MAX (= 4) so a single
                  conditional is sufficient. */}
              {count === 1 ? "1 item selected" : `${count} items selected`}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={buildCompareUrl(slugs)}
                data-testid="compare-bar-cta"
                className="inline-flex h-10 items-center justify-center rounded-md bg-cf-cta px-4 text-sm font-medium text-cf-cream transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Compare
              </Link>
              <button
                type="button"
                aria-label="Clear compare selection"
                data-testid="compare-bar-clear"
                onClick={handleClear}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-cf-divider text-cf-ink transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:hover:bg-cf-ink/10"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
