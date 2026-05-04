"use client";

import { useState, useMemo } from "react";

import { ProductCard } from "@/components/product/ProductCard";
import type { WixProduct } from "@/lib/wix/products";
import { formatPlpPrice } from "@/lib/product/plp-price";

export type ThemeDCategory = {
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
];

function productPrice(p: WixProduct): number {
  return p.priceRange?.minValue ?? p.priceData?.price ?? 0;
}

function matchesPrice(p: WixProduct, rangeIdx: number): boolean {
  const { min, max } = PRICE_RANGES[rangeIdx]!;
  const price = productPrice(p);
  return price >= min && price <= max;
}

export function FilterFirst({ categories }: { categories: ThemeDCategory[] }) {
  const [categorySlug, setCategorySlug] = useState<string>("all");
  const [priceIdx, setPriceIdx] = useState(0);

  const baseProducts = useMemo(() => {
    if (categorySlug === "all") {
      const seen = new Set<string>();
      return categories
        .flatMap((c) => c.products)
        .filter((p) => {
          if (!p._id || seen.has(p._id)) return false;
          seen.add(p._id);
          return true;
        });
    }
    return categories.find((c) => c.slug === categorySlug)?.products ?? [];
  }, [categories, categorySlug]);

  const filtered = useMemo(
    () => baseProducts.filter((p) => matchesPrice(p, priceIdx)),
    [baseProducts, priceIdx],
  );

  const allCategory: ThemeDCategory = { slug: "all", label: "All", products: [] };
  const tabs = [allCategory, ...categories];

  return (
    <div className="theme-d-shell" style={{ fontFamily: "var(--font-theme-d-body, var(--font-sans))" }}>
      {/* Hero filter panel */}
      <section
        aria-labelledby="theme-d-heading"
        className="mx-auto w-full max-w-7xl px-4 pb-6 pt-14 sm:px-6 lg:px-8"
      >
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-cf-cta">
          Family owned · Hendersonville, NC
        </p>
        <h1
          id="theme-d-heading"
          className="mt-3 text-5xl font-bold leading-[1.02] tracking-tight text-cf-espresso sm:text-6xl lg:text-7xl"
          style={{ fontFamily: "var(--font-theme-d-heading, var(--font-heading))" }}
        >
          Find your perfect futon
        </h1>
        <p className="mt-4 max-w-xl text-lg text-cf-charcoal/70">
          Hardwood frames built by hand, mattresses we actually sleep on,
          and shipping that shows up.
        </p>

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
              onClick={() => setCategorySlug(cat.slug)}
              aria-pressed={categorySlug === cat.slug}
              className={[
                "h-9 rounded-full border px-4 text-sm font-medium transition-colors",
                categorySlug === cat.slug
                  ? "border-cf-espresso bg-cf-espresso text-white"
                  : "border-cf-divider bg-white text-cf-espresso hover:border-cf-espresso",
              ].join(" ")}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Price filters */}
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
                "h-8 rounded-full border px-3 text-xs font-medium transition-colors",
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
      <section aria-label="Products" className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {filtered.length === 0 ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-cf-divider">
            <p className="text-sm text-muted-foreground">
              Try a different category or price range
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((product, i) => (
              <li key={product._id}>
                <ProductCard product={product} priority={i < 4} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
