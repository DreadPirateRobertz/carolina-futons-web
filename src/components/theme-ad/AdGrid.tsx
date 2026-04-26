"use client";

// A+D hybrid grid — Theme A warmth × Theme D filter-first interactivity.
//
// Fontshare Clash Display (heading) + Satoshi (body) scope to this component
// via the ad-grid-shell class. Category and price chips are below-fold;
// the product grid responds to both filters client-side.

import { useState, useMemo } from "react";

import { ProductCard } from "@/components/product/ProductCard";
import type { WixProduct } from "@/lib/wix/products";

export type AdCategory = {
  slug: string;
  label: string;
  products: readonly WixProduct[];
};

const PRICE_RANGES = [
  { label: "Any price", min: 0, max: Infinity },
  { label: "Under $500", min: 0, max: 499 },
  { label: "$500 – $1,000", min: 500, max: 1000 },
  { label: "$1,000 – $2,000", min: 1000, max: 2000 },
  { label: "$2,000+", min: 2000, max: Infinity },
] as const;

function productPrice(p: WixProduct): number {
  return p.priceRange?.minValue ?? p.priceData?.price ?? 0;
}

export function AdGrid({ categories }: { categories: AdCategory[] }) {
  const [activeCat, setActiveCat] = useState<string>("all");
  const [priceIdx, setPriceIdx] = useState(0);

  const base = useMemo(() => {
    if (activeCat === "all") {
      const seen = new Set<string>();
      return categories
        .flatMap((c) => c.products)
        .filter((p) => {
          if (!p._id || seen.has(p._id)) return false;
          seen.add(p._id);
          return true;
        });
    }
    return categories.find((c) => c.slug === activeCat)?.products ?? [];
  }, [categories, activeCat]);

  const filtered = useMemo(() => {
    const { min, max } = PRICE_RANGES[priceIdx]!;
    return base.filter((p) => {
      const price = productPrice(p);
      return price >= min && price <= max;
    });
  }, [base, priceIdx]);

  const tabs = [{ slug: "all", label: "All" }, ...categories];

  return (
    <div className="ad-grid-shell">
      <section
        aria-labelledby="ad-grid-heading"
        data-slot="ad-grid"
        className="mx-auto w-full max-w-7xl px-4 pb-8 pt-14 sm:px-6 lg:px-8"
      >
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-cf-cta">
          Family owned · Hendersonville, NC
        </p>
        <h2
          id="ad-grid-heading"
          className="mt-3 font-heading text-5xl font-bold leading-[1.02] tracking-[-0.03em] text-cf-espresso sm:text-6xl"
        >
          Shop our collection
        </h2>

        {/* Category chips */}
        <div
          role="group"
          aria-label="Filter by category"
          className="mt-8 flex flex-wrap gap-2"
        >
          {tabs.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setActiveCat(cat.slug)}
              aria-pressed={activeCat === cat.slug}
              className={[
                "h-9 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-espresso focus-visible:ring-offset-2",
                activeCat === cat.slug
                  ? "border-cf-espresso bg-cf-espresso text-white"
                  : "border-cf-divider bg-white text-cf-espresso hover:border-cf-espresso",
              ].join(" ")}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Price chips */}
        <div
          role="group"
          aria-label="Filter by price"
          className="mt-3 flex flex-wrap gap-2"
        >
          {PRICE_RANGES.map((range, i) => (
            <button
              key={range.label}
              type="button"
              onClick={() => setPriceIdx(i)}
              aria-pressed={priceIdx === i}
              className={[
                "h-8 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2",
                priceIdx === i
                  ? "border-cf-cta bg-cf-cta text-white"
                  : "border-cf-divider bg-white text-cf-charcoal hover:border-cf-cta",
              ].join(" ")}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Result count */}
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-5 text-sm font-medium tabular-nums text-cf-charcoal/60"
        >
          {filtered.length === 0
            ? "No products match those filters"
            : `${filtered.length} product${filtered.length === 1 ? "" : "s"}`}
        </p>
      </section>

      {/* Product grid */}
      <section
        aria-label="Products"
        className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"
      >
        {filtered.length === 0 ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-cf-divider">
            <p className="text-sm text-cf-charcoal/50">
              Try a different category or price range
            </p>
          </div>
        ) : (
          <ul
            className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4"
            role="list"
          >
            {filtered.map((product, i) => (
              <li key={product._id}>
                <div className="group relative">
                  <ProductCard product={product} priority={i < 4} />
                  {/* Mr Pops sunrise — warm cf-cta tint rises from card bottom on hover */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-t from-[rgba(200,118,58,0.20)] to-transparent opacity-0 transition-opacity duration-[250ms] ease-out motion-reduce:transition-none group-hover:opacity-100 group-focus-within:opacity-100"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
