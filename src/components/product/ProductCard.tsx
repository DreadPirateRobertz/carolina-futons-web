"use client";

import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";

import { formatPlpPrice } from "@/lib/product/plp-price";
import { getPlpCardImages } from "@/lib/product/plp-card-images";
import type { WixProduct } from "@/lib/wix/products";

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

export function ProductCard({ product }: { product: WixProduct }) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const href = product.slug ? `/products/${product.slug}` : "#";
  const { primary, secondary } = getPlpCardImages(product);
  const showStrikethrough = hasDiscount(product) && !hasRange(product);
  const hasSecondary = secondary !== null;

  const hoverVariant = prefersReducedMotion
    ? { opacity: REDUCED_OPACITY, y: 0 }
    : { opacity: 1, y: MOTION_Y_PX };

  return (
    <m.div
      data-slot="product-card"
      data-has-secondary={hasSecondary ? "true" : "false"}
      data-reduced-motion={prefersReducedMotion ? "true" : "false"}
      className="relative overflow-hidden rounded-lg border border-zinc-200 shadow-sm transition-shadow duration-200 hover:border-zinc-400 hover:shadow-lg focus-within:border-zinc-400 focus-within:shadow-lg"
      initial={{ opacity: 1, y: 0 }}
      whileHover={hoverVariant}
      whileFocus={hoverVariant}
      transition={{ duration: MOTION_DURATION_SEC, ease: "easeOut" }}
    >
      <Link href={href} className="group block focus:outline-none">
        <div className="relative aspect-square w-full overflow-hidden rounded-t-lg bg-zinc-100">
          {primary ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={primary}
                alt={product.name ?? ""}
                data-slot="product-card-primary-image"
                className={
                  prefersReducedMotion
                    ? "absolute inset-0 h-full w-full object-cover"
                    : "absolute inset-0 h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03] group-focus-within:scale-[1.03]"
                }
              />
              {hasSecondary && !prefersReducedMotion ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={secondary ?? undefined}
                  alt=""
                  aria-hidden="true"
                  data-slot="product-card-secondary-image"
                  className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
                />
              ) : null}
            </>
          ) : null}
        </div>
        <div className="p-4">
          <h2 className="text-base font-medium">{product.name}</h2>
          {showStrikethrough ? (
            <div className="mt-1 flex items-center gap-2 text-sm">
              <span className="line-through text-zinc-400">
                {product.priceData?.formatted?.price}
              </span>
              <span className="font-medium text-red-600">
                {product.priceData?.formatted?.discountedPrice}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-zinc-600">
              {formatPlpPrice(product)}
            </p>
          )}
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
    </m.div>
  );
}
