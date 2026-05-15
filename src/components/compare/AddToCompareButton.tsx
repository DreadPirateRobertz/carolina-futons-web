"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { COMPARE_MAX } from "@/lib/product/compare";
import { toggleCompareSlug } from "@/lib/product/compare-state";
import { useCompareSlugs } from "@/lib/product/use-compare-slugs";

export function AddToCompareButton({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  // cf-1imv: shared hook keeps this button + CompareBar + CompareTable on
  // the same cf-compare-change subscription path (was duplicated inline).
  const slugs = useCompareSlugs();

  const isComparing = slugs.includes(slug);
  const atMax = !isComparing && slugs.length >= COMPARE_MAX;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Prevent the parent <Link> (ProductCard) from navigating on click.
      e.preventDefault();
      e.stopPropagation();
      // toggleCompareSlug() dispatches cf-compare-change; the hook
      // re-renders us with the updated list — no local setSlugs needed.
      toggleCompareSlug(slug);
    },
    [slug],
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={atMax}
      aria-disabled={atMax}
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
