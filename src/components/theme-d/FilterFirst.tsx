"use client";

import { useState, useMemo } from "react";
import Image from "next/image";

import { ProductCard } from "@/components/product/ProductCard";
import type { WixProduct } from "@/lib/wix/products";
import type { ColorChoice } from "@/lib/product/color-options";
import type { FilterFirstHeroCopy } from "@/lib/cms/filter-first-content";

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

export function FilterFirst({
  categories,
  colorChoicesByProductId,
  heroCopy,
}: {
  categories: ThemeDCategory[];
  /**
   * Map of `product._id` → color choices, populated server-side via
   * `enrichProductsWithColorChoices`. Optional — when absent, ProductCard
   * skips the swatch row gracefully.
   */
  colorChoicesByProductId?: ReadonlyMap<string, ReadonlyArray<ColorChoice>>;
  /**
   * Brenda-editable hero copy resolved by the server parent via
   * `loadFilterFirstHeroCopy()`. Required prop so consumers cannot ship
   * with stale hardcoded copy; the loader's fallbacks match the pre-refactor
   * shipped strings, so the rendered output is identical when the CMS rows
   * are absent.
   */
  heroCopy: FilterFirstHeroCopy;
}) {
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
    return (categories.find((c) => c.slug === categorySlug)?.products ?? []).filter((p) => !!p._id);
  }, [categories, categorySlug]);

  const filtered = useMemo(
    () => baseProducts.filter((p) => matchesPrice(p, priceIdx)),
    [baseProducts, priceIdx],
  );

  const allCategory: ThemeDCategory = { slug: "all", label: "All", products: [] };
  const tabs = [allCategory, ...categories];

  return (
    <div className="theme-d-shell" style={{ fontFamily: "var(--font-theme-d-body, var(--font-sans))" }}>
      {/* Hero filter panel — cfw-x20 (cfw-y2i.3): two-column on md+ with the
          v9 three-bear realistic photo as right anchor, mobile stacks photo
          above the headline as a wide banner so the fold opens with image
          before utility. Resolves Stilgar's "no photographic punch above the
          fold" feedback from the visual-parity audit (§1). */}
      <section
        aria-labelledby="theme-d-heading"
        className="mx-auto w-full max-w-7xl px-4 pb-6 pt-14 sm:px-6 lg:px-8"
      >
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12">
          <div className="order-2 md:order-1">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-cf-cta">
          {heroCopy.eyebrow}
        </p>
        <h1
          id="theme-d-heading"
          className="mt-3 text-5xl font-bold leading-[1.02] tracking-tight text-cf-espresso sm:text-6xl lg:text-7xl"
          style={{ fontFamily: "var(--font-theme-d-heading, var(--font-heading))" }}
        >
          {heroCopy.headline}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-cf-charcoal/70">
          {heroCopy.subhead}
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
          className="mt-5 text-sm font-medium tabular-nums text-cf-charcoal/70"
        >
          {filtered.length === 0
            ? "No products match those filters"
            : `${filtered.length} product${filtered.length === 1 ? "" : "s"}`}
        </p>
          </div>

          {/* v9 three-bear photographic anchor. Mobile: full-width banner
              above the headline (order-1). md+: square-ish portrait in the
              right column. Source asset is large (~2 MB) — Next/Image's
              optimizer crops + serves WebP at the requested sizes so the LCP
              candidate is well under 100 KB on the wire. Marked priority so
              the home fold doesn't ship without it. */}
          <div className="order-1 md:order-2 relative aspect-[16/9] w-full overflow-hidden rounded-2xl md:aspect-[4/5] lg:aspect-[5/6]">
            <Image
              src="/design/animals/bears.jpg"
              alt="Three bears on the porch — Carolina Futons, family-owned in Hendersonville, NC since 1991"
              fill
              priority
              sizes="(min-width: 1024px) 540px, (min-width: 768px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
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
              <li key={product._id ?? product.slug}>
                <ProductCard
                  product={product}
                  priority={i < 4}
                  colorChoices={
                    product._id
                      ? colorChoicesByProductId?.get(product._id)
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
