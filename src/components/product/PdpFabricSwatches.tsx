"use client";

import { useMemo, useState } from "react";

import type { SwatchItem } from "@/lib/swatch-request/swatch-request-schema";

const INITIAL_VISIBLE = 12;

type Props = {
  swatches: SwatchItem[];
  productSlug: string;
};

export function PdpFabricSwatches({ swatches, productSlug }: Props) {
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const families = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const s of swatches) {
      if (s.colorFamily && !seen.has(s.colorFamily)) {
        seen.add(s.colorFamily);
        result.push(s.colorFamily);
      }
    }
    return result;
  }, [swatches]);

  const filtered = activeFamily
    ? swatches.filter((s) => s.colorFamily === activeFamily)
    : swatches;

  const visible = showAll ? filtered : filtered.slice(0, INITIAL_VISIBLE);

  if (swatches.length === 0) return null;

  return (
    <section
      aria-labelledby="pdp-fabric-swatches-heading"
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <h2
          id="pdp-fabric-swatches-heading"
          className="text-sm font-semibold tracking-tight text-cf-ink"
        >
          Available fabrics
          <span className="ml-1.5 font-normal text-cf-muted">
            ({swatches.length})
          </span>
        </h2>
        <a
          href={`/swatch-request?product=${encodeURIComponent(productSlug)}`}
          className="text-xs text-cf-cta underline underline-offset-2 hover:text-cf-cta/80"
        >
          Order free swatches
        </a>
      </div>

      {families.length > 1 && (
        <div
          role="group"
          aria-label="Filter by color family"
          className="flex flex-wrap gap-1.5"
        >
          <button
            type="button"
            onClick={() => { setActiveFamily(null); setShowAll(false); }}
            aria-pressed={activeFamily === null}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              activeFamily === null
                ? "bg-cf-cta text-white"
                : "bg-cf-sand text-cf-ink hover:bg-cf-sand/70"
            }`}
          >
            All
          </button>
          {families.map((family) => (
            <button
              key={family}
              type="button"
              onClick={() => {
                setActiveFamily(family === activeFamily ? null : family);
                setShowAll(false);
              }}
              aria-pressed={activeFamily === family}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                activeFamily === family
                  ? "bg-cf-cta text-white"
                  : "bg-cf-sand text-cf-ink hover:bg-cf-sand/70"
              }`}
            >
              {family}
            </button>
          ))}
        </div>
      )}

      <ul
        aria-label="Fabric swatches"
        className="grid grid-cols-6 gap-x-2 gap-y-3"
      >
        {visible.map((swatch) => (
          <li key={swatch._id}>
            <div className="flex flex-col items-center gap-1">
              <div
                aria-hidden="true"
                className="h-8 w-8 rounded-full border border-cf-divider shadow-sm"
                style={
                  swatch.colorHex ? { backgroundColor: swatch.colorHex } : undefined
                }
              />
              <span className="line-clamp-2 text-center text-[10px] leading-tight text-cf-muted">
                {swatch.swatchName}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {filtered.length > INITIAL_VISIBLE && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-xs text-cf-cta underline underline-offset-2 hover:text-cf-cta/80"
        >
          {showAll
            ? "Show fewer"
            : `Show all ${filtered.length} fabrics`}
        </button>
      )}
    </section>
  );
}
