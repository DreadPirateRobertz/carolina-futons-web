"use client";

import Image from "next/image";
import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";

import { formatPlpPrice } from "@/lib/product/plp-price";
import { getPlpCardImages } from "@/lib/product/plp-card-images";
import { getReviewStats } from "@/lib/product/review-stats";
import { AddToCompareButton } from "@/components/compare/AddToCompareButton";
import { PdpProductBadges } from "@/components/product/PdpProductBadges";
import { ProductCardSwatchRow } from "@/components/product/ProductCardSwatchRow";
import { QuickViewButton } from "@/components/product/QuickViewButton";
import type { ColorChoice } from "@/lib/product/color-options";
import type { WixProduct } from "@/lib/wix/products";
import type { ProductBadgeType } from "@/lib/wix/product-badges";

function hasDiscount(product: WixProduct): boolean {
  const price = product.priceData?.price;
  const discounted = product.priceData?.discountedPrice;
  return (
    typeof price === "number" &&
    typeof discounted === "number" &&
    discounted < price
  );
}

function hasRange(product: WixProduct): boolean {
  const min = product.priceRange?.minValue;
  const max = product.priceRange?.maxValue;
  return typeof min === "number" && typeof max === "number" && max > 0;
}

// Phase 7 hover/focus motion budget (pointer or keyboard triggers the same
// branch for a11y parity):
//   - card lift: y 0 → -4px, 200ms ease-out (cf-card-hover-lift)
//   - card shadow-sm → shadow-lg on hover/focus-within (CSS, not framer —
//     shadow is safe under reduced-motion so we keep it even when transforms
//     are suppressed)
//   - primary image zoom 1.00 → 1.03 via group-hover:/group-focus-within:
//     (CSS, suppressed under reduced-motion for vestibular safety)
//   - secondary image cross-fades in at 100% opacity when product has ≥2 images
//   - cf-cta accent strip scales from 0 → 100% width at the card bottom
// Reduced-motion: opacity tint + shadow only (no transform), vestibular-safe.
// Keyboard and pointer both drive the SAME whileHover/whileFocus variant so
// focus-visible ring users get the same affordance.
const MOTION_DURATION_SEC = 0.2;
const MOTION_Y_PX = -4;
const REDUCED_OPACITY = 0.92;

// Default `sizes` matches the PLP /shop/[category] 4-col grid (the LCP-critical
// surface): 25vw on desktop, 33vw on tablet, 50vw on mobile. Featured strip
// (6-col desktop) passes a tighter override.
const DEFAULT_PLP_SIZES =
  "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

// `priority` marks above-fold cards so next/image emits fetchpriority="high"
// + loading="eager" (LCP win, especially on PLP grids where the first product
// card image is the LCP element). Cards below the fold default to lazy.
// Callers should pass priority for the first N visible cards (~3 on the
// Featured strip, ~4 on PLP).
export function ProductCard({
  product,
  priority = false,
  sizes = DEFAULT_PLP_SIZES,
  badges,
  colorChoices,
}: {
  product: WixProduct;
  priority?: boolean;
  sizes?: string;
  badges?: readonly ProductBadgeType[];
  /**
   * Optional color choices for the "Available in N colors" badge + dot strip.
   * Server-side enrichment (see lib/product/enrich-colors.ts) populates this
   * for surfaces that want it; PLP grids without enrichment leave it
   * undefined and the badge is omitted.
   */
  colorChoices?: ReadonlyArray<ColorChoice>;
}) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const href = product.slug ? `/products/${product.slug}` : "#";
  const { primary, secondary } = getPlpCardImages(product);
  const showStrikethrough = hasDiscount(product) && !hasRange(product);
  const hasSecondary = secondary !== null;

  const hoverVariant = prefersReducedMotion
    ? { opacity: REDUCED_OPACITY, y: 0 }
    : { opacity: 1, y: MOTION_Y_PX };

  const reviewStats = getReviewStats(product.slug);

  return (
    <m.div
      data-slot="product-card"
      data-has-secondary={hasSecondary ? "true" : "false"}
      data-reduced-motion={prefersReducedMotion ? "true" : "false"}
      className="relative overflow-hidden rounded-lg border border-zinc-200 shadow-sm transition-shadow duration-200 hover:border-zinc-400 hover:shadow-lg focus-within:border-zinc-400 focus-within:shadow-lg dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-500 dark:focus-within:border-zinc-500"
      initial={{ opacity: 1, y: 0 }}
      whileHover={hoverVariant}
      whileFocus={hoverVariant}
      transition={{ duration: MOTION_DURATION_SEC, ease: "easeOut" }}
    >
      <Link href={href} className="group block focus:outline-none">
        <div className="relative aspect-square w-full overflow-hidden rounded-t-lg bg-zinc-100 dark:bg-zinc-700">
          {primary ? (
            <>
              <Image
                src={primary}
                alt={product.name ?? ""}
                data-slot="product-card-primary-image"
                fill
                sizes={sizes}
                priority={priority}
                className={
                  prefersReducedMotion
                    ? "object-cover"
                    : "object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03] group-focus-within:scale-[1.03]"
                }
              />
              {hasSecondary && secondary && !prefersReducedMotion ? (
                <Image
                  src={secondary}
                  alt=""
                  aria-hidden="true"
                  data-slot="product-card-secondary-image"
                  fill
                  sizes={sizes}
                  loading="lazy"
                  className="object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
                />
              ) : null}
            </>
          ) : null}
        </div>
        <div className="p-4">
          <h2 className="text-base font-medium dark:text-zinc-100">{product.name}</h2>
          {badges && badges.length > 0 && (
            <div className="mt-1">
              <PdpProductBadges badges={badges} />
            </div>
          )}
          {showStrikethrough ? (
            <div className="mt-1 flex items-center gap-2 text-sm">
              <span className="line-through text-zinc-400 dark:text-zinc-400">
                {product.priceData?.formatted?.price}
              </span>
              <span className="font-medium text-red-600 dark:text-red-400">
                {product.priceData?.formatted?.discountedPrice}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {formatPlpPrice(product)}
            </p>
          )}
          {reviewStats ? (
            <p
              data-testid="review-badge"
              className="mt-1 text-xs text-cf-charcoal/60 dark:text-zinc-400"
            >
              <span aria-hidden="true">★</span>{" "}
              {reviewStats.rating.toFixed(1)} ({reviewStats.count}{" "}
              {reviewStats.count === 1 ? "review" : "reviews"})
            </p>
          ) : null}
          {colorChoices && colorChoices.length > 0 ? (
            <ProductCardSwatchRow choices={colorChoices} />
          ) : null}
        </div>
        {/* cf-cta accent strip: scales from 0 → full width on hover/focus,
            reveal-on-intent. Under reduced-motion we render nothing so the
            card surface is fully static for vestibular-sensitive users. */}
        {!prefersReducedMotion ? (
          <span
            data-slot="product-card-accent"
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-cf-cta transition-transform duration-200 ease-out group-hover:scale-x-100 group-focus-within:scale-x-100"
          />
        ) : null}
      </Link>
      {product.slug ? (
        // Sibling of Link inside m.div so hover-lift carries the button with
        // the card. bottom-12/right-2 stays within overflow-hidden bounds.
        <div className="absolute bottom-12 right-2 z-10">
          <AddToCompareButton slug={product.slug} />
        </div>
      ) : null}
      {product.slug ? (
        // Top-right quick-view trigger; sibling of Link to avoid nested-anchor
        // semantics and to keep card-click → PDP navigation intact.
        <div className="absolute right-2 top-2 z-10">
          <QuickViewButton slug={product.slug} productName={product.name ?? ""} />
        </div>
      ) : null}
    </m.div>
  );
}
