"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { COMPARE_MAX } from "@/lib/product/compare";
import {
  getCompareSlugs,
  toggleCompareSlug,
} from "@/lib/product/compare-state";

export function AddToCompareButton({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const [slugs, setSlugs] = useState<string[]>([]);

  // Hydrate from localStorage on mount and subscribe to cross-component
  // changes via the custom "cf-compare-change" event so PDP and PLP buttons
  // stay in sync when both are visible (mobile scroll with sticky CTA).
  useEffect(() => {
    setSlugs(getCompareSlugs());
    const onchange = () => setSlugs(getCompareSlugs());
    window.addEventListener("cf-compare-change", onchange);
    return () => window.removeEventListener("cf-compare-change", onchange);
  }, []);

  const isComparing = slugs.includes(slug);
  const atMax = !isComparing && slugs.length >= COMPARE_MAX;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Prevent the parent <Link> (ProductCard) from navigating on click.
      e.preventDefault();
      e.stopPropagation();
      setSlugs(toggleCompareSlug(slug));
    },
    [slug],
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={atMax}
      aria-pressed={isComparing}
      data-testid="add-to-compare"
      title={
        atMax
          ? `Compare is full (max ${COMPARE_MAX} items)`
          : isComparing
            ? "Remove from compare"
            : "Add to compare"
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-1",
        isComparing
          ? "border-cf-cta bg-cf-cta/10 text-cf-cta hover:bg-cf-cta/20"
          : atMax
            ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400"
            : "border-zinc-300 bg-white text-zinc-700 hover:border-cf-cta hover:text-cf-cta",
        className,
      )}
    >
      {isComparing ? (
        <>
          <span aria-hidden="true">✓</span> In compare
        </>
      ) : atMax ? (
        "Compare full"
      ) : (
        "Compare"
      )}
    </button>
  );
}
