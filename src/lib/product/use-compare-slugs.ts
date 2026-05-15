"use client";

// cf-1imv: extracted hook so CompareBar + AddToCompareButton share one
// subscription path to the compare queue. Pre-extraction the lazy-init +
// useEffect + cf-compare-change listener pattern lived in two components,
// which is exactly how cross-component sync drifts: somebody adds a third
// consumer, copies the pattern, and forgets the event name. Hook owns
// the contract.

import { useEffect, useState } from "react";

import { getCompareSlugs } from "@/lib/product/compare-state";

/**
 * Subscribe to the cross-component compare queue (the `cf-compare-change`
 * window event). Returns the current slugs and re-renders the caller
 * whenever any component on the page mutates the queue via
 * `setCompareSlugs()` / `toggleCompareSlug()`.
 *
 * SSR-safe: `getCompareSlugs()` guards `window` access and returns `[]`
 * during SSR, so the lazy initializer is hydration-safe.
 */
export function useCompareSlugs(): string[] {
  const [slugs, setSlugs] = useState<string[]>(() => getCompareSlugs());

  useEffect(() => {
    const sync = () => setSlugs(getCompareSlugs());
    window.addEventListener("cf-compare-change", sync);
    return () => window.removeEventListener("cf-compare-change", sync);
  }, []);

  return slugs;
}
