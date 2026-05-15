"use client";

// cf-1imv: sticky bottom-anchored bar that surfaces the compare-queue from
// localStorage so users get persistent feedback after tapping "Compare"
// on a PDP/PLP card. Without this, the selection is invisible and the
// /compare page has no discovery affordance.
//
// State source: localStorage via useCompareSlugs() — same single source
// of truth that AddToCompareButton + CompareTable read. The hook owns
// the cf-compare-change subscription, so this component only renders.

import { AnimatePresence, m } from "framer-motion";
import Link from "next/link";
import { X } from "lucide-react";

import { buildCompareUrl, setCompareSlugs } from "@/lib/product/compare-state";
import { useCompareSlugs } from "@/lib/product/use-compare-slugs";

export function CompareBar() {
  const slugs = useCompareSlugs();
  const count = slugs.length;
  const visible = count > 0;

  // Clear delegates to the canonical setter; the listener inside
  // useCompareSlugs catches the dispatched cf-compare-change and
  // re-renders this component with the empty list — driving the
  // AnimatePresence exit cleanly.
  const handleClear = () => {
    setCompareSlugs([]);
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
          // Strictly below BackToTop's z-index (currently z-40) so the
          // floating button remains clickable when the bar is visible.
          className="fixed inset-x-0 bottom-0 z-30 border-t border-cf-divider bg-white shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.15)] dark:bg-cf-cream dark:border-cf-ink/30"
        >
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="text-sm font-medium text-cf-ink">
              {/* Count is bounded (see COMPARE_MAX in compare-state) and
                  English pluralization is regular for 2..N, so a single
                  conditional avoids pulling in Intl.PluralRules. */}
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
                // dark:border-cf-ink/60 (not /30) so the non-text-contrast
                // ratio against bg-cf-cream meets WCAG AA (3:1) per the
                // cf-tu3q font-contrast audit's CTA-token guidance.
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-cf-divider text-cf-ink transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-cf-ink/60 dark:hover:bg-cf-ink/10"
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
