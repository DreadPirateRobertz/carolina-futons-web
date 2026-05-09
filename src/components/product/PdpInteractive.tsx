"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import {
  AddToCartButton,
  type AddToCartButtonProps,
} from "@/components/cart/AddToCartButton";
import { AddToCompareButton } from "@/components/compare/AddToCompareButton";
import { PdpGallery, type GalleryImage } from "@/components/product/PdpGallery";
import { PdpShippingEstimate } from "@/components/product/PdpShippingEstimate";
import { PdpStickyCta } from "@/components/product/PdpStickyCta";
import { PdpStockBadge } from "@/components/product/PdpStockBadge";
import { ProductInventoryBadge } from "@/components/product/ProductInventoryBadge";
import { PdpProductBadges } from "@/components/product/PdpProductBadges";
import type { ProductBadgeType } from "@/lib/wix/product-badges";
import { PdpFabricSwatches } from "@/components/product/PdpFabricSwatches";
import { PdpWhiteGlove } from "@/components/product/PdpWhiteGlove";
import { PdpWishlistButton } from "@/components/product/PdpWishlistButton";
import { VariantPicker } from "@/components/product/VariantPicker";

// cf-u67q: pull below-the-fold PDP affordances behind next/dynamic so they
// stay in the SSR HTML (no SEO/UX regression) but get split out of the
// initial client chunk. Cuts the main-thread script-evaluation cost on PDP
// load, which dominated TBT in the pre-cutover Lighthouse audit.
//
// Components asserted on directly by PdpInteractive.test.tsx (PdpStickyCta,
// PdpFabricSwatches, PdpWhiteGlove) intentionally stay as static imports —
// the existing test harness asserts their rendered subtree synchronously,
// and rewiring those tests to await dynamic resolution is out of scope for
// this perf fix. The remaining four still ship in their own chunks, which
// is where the long-tail cost lives.
const BnplWidget = dynamic(() =>
  import("@/components/product/BnplWidget").then((m) => ({
    default: m.BnplWidget,
  })),
);
const PdpNotifyMe = dynamic(() =>
  import("@/components/product/PdpNotifyMe").then((m) => ({
    default: m.PdpNotifyMe,
  })),
);
const PriceLockGuarantee = dynamic(() =>
  import("@/components/product/PriceLockGuarantee").then((m) => ({
    default: m.PriceLockGuarantee,
  })),
);
import type { StockBadgeInput } from "@/lib/product/stock-badge-state";
import type { SwatchItem } from "@/lib/swatch-request/swatch-request-schema";
import {
  findMatchingVariant,
  getSelectedImageUrl,
  getSelectedPrice,
  getSelectedPriceCents,
  initialSelection,
  isSelectionComplete,
  isVariantInStock,
  type ChoiceSelection,
  type GalleryMediaItem,
  type ProductOptionInput,
  type VariantInput,
} from "@/lib/product/variant-selection";
import { wixImageUrl } from "@/lib/wix/wix-image";

function resolveInStock(
  selectedVariant: ReturnType<typeof findMatchingVariant>,
  productOptions: ReadonlyArray<ProductOptionInput>,
  stock: StockBadgeInput | null | undefined,
): boolean {
  if (selectedVariant) return isVariantInStock(selectedVariant);
  // Simple product (no options) — fall back to product-level stock.
  if (productOptions.length === 0) return stock?.inStock !== false;
  // Variant product with incomplete selection — disabled independently via
  // !selectionComplete so this value is never used to block a purchase.
  return false;
}

export type PdpInteractiveProps = {
  productId: string;
  productSlug: string;
  productName: string;
  productOptions: ReadonlyArray<ProductOptionInput>;
  variants: ReadonlyArray<VariantInput>;
  fallbackImageUrl: string | undefined;
  fallbackPrice: string;
  fallbackPriceCents: number;
  // For manageVariants products priceData.price = 0; pass priceRange.maxValue here
  // so the white-glove widget shows for high-end variant products (cf-kcnu GAP-2).
  whiteGlovePriceCents?: number;
  galleryImages?: ReadonlyArray<GalleryImage>;
  // cfw-88r: raw Wix media.items[] passed through so getSelectedImageUrl can
  // fall back to title/altText matching when per-choice media is missing.
  mediaItems?: ReadonlyArray<GalleryMediaItem>;
  // cfw-x3w: 360° spin frames (sorted by index) extracted upstream from
  // mediaItems via extractSpinFrames. Empty/undefined disables the toggle.
  spinImages?: ReadonlyArray<string>;
  stock?: StockBadgeInput | null;
  badges?: readonly ProductBadgeType[];
  fabricSwatches?: SwatchItem[];
  fabricSwatchError?: boolean;
  weightLbs?: number;
  palletized?: boolean;
};

export function PdpInteractive({
  productId,
  productSlug,
  productName,
  productOptions,
  variants,
  fallbackImageUrl,
  fallbackPrice,
  fallbackPriceCents,
  whiteGlovePriceCents,
  galleryImages,
  mediaItems,
  spinImages,
  stock,
  badges,
  fabricSwatches,
  fabricSwatchError,
  weightLbs,
  palletized,
}: PdpInteractiveProps) {
  // Intentional duplication: VariantPicker also seeds from initialSelection() and holds its own
  // selection state for price/stock display. The two stay in sync via onSelectionChange. If
  // URL-param hydration ever seeds them differently, lift selection here and make VariantPicker
  // controlled (accept selection as a prop).
  const [selection, setSelection] = useState<ChoiceSelection>(() =>
    initialSelection(productOptions, variants),
  );
  const primaryCtaRef = useRef<HTMLDivElement>(null);
  // Seed `true` (primary visible) for two reasons: (1) avoids a first-paint
  // flash of the sticky bar before the observer's first callback fires on the
  // client; (2) keeps the sticky bar absent during SSR and any environment
  // without IntersectionObserver (old browsers, jsdom without the polyfill) —
  // since the effect below bails, `primaryInView` stays `true` and the bar
  // stays hidden. An accidental seed of `false` here would render a hard-coded
  // sticky bar for every SSR + no-IO user, which is worse than no bar at all.
  const [primaryInView, setPrimaryInView] = useState(true);

  useEffect(() => {
    const el = primaryCtaRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setPrimaryInView(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const imageUrl = getSelectedImageUrl(
    variants,
    selection,
    fallbackImageUrl,
    productOptions,
    mediaItems,
  );
  const selectedPrice = getSelectedPrice(variants, selection, fallbackPrice);
  const selectedPriceCents = getSelectedPriceCents(variants, selection, fallbackPriceCents);
  const selectedVariant = findMatchingVariant(variants, selection);
  const selectionComplete =
    productOptions.length === 0 || isSelectionComplete(productOptions, selection);
  const inStock = resolveInStock(selectedVariant, productOptions, stock);
  // cfw-6bp: low-stock urgency cue. Prefers the selected variant's
  // stockStatus.quantity; falls back to product-level when the product has no
  // variants. Stays null when nothing tracked, which makes the badge a no-op.
  const lowStockQuantity =
    selectedVariant?.stock?.quantity ??
    (productOptions.length === 0 ? stock?.quantity ?? null : null);
  const variantLabel = Object.entries(selection)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const disabledReason = !selectionComplete
    ? "Select options to continue"
    : !inStock
      ? "Out of stock"
      : undefined;

  // Shared by the primary CTA and the sticky bar so both invoke the same
  // cart action with identical props. Typed against AddToCartButton's own
  // prop type to catch drift if the button contract changes.
  const addToCartProps: AddToCartButtonProps = {
    productId,
    productName,
    variantId: selectedVariant?._id ?? undefined,
    variantLabel: variantLabel || undefined,
    options: selection,
    imageUrl,
    productUrl: `/products/${productSlug}`,
    unitPriceCents: selectedPriceCents,
    formattedUnitPrice: selectedPrice,
    disabled: !selectionComplete || !inStock,
    disabledReason,
  };

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <div data-slot="pdp-media">
        {galleryImages && galleryImages.length > 0 ? (
          <PdpGallery
            images={galleryImages}
            productName={productName}
            activeUrl={imageUrl}
            spinImages={spinImages}
          />
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wixImageUrl(imageUrl, 600, 600)}
            alt={productName}
            data-testid="pdp-main-image"
            // cfw-vxb: PDP LCP candidate (no-gallery fallback path). Mirrors
            // the priority hints on PdpGallery's main image so single-image
            // products get the same LCP boost.
            fetchPriority="high"
            loading="eager"
            decoding="async"
            // cfw-l0m: contain not cover — match PdpGallery main image and
            // show the whole product at the no-gallery fallback path too.
            className="aspect-square w-full rounded-lg object-contain"
          />
        ) : (
          <div className="aspect-square w-full rounded-lg bg-cf-sand" />
        )}
      </div>
      <div data-slot="pdp-details" className="space-y-6">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-cf-espresso">
          {productName}
        </h1>
        {badges && badges.length > 0 && <PdpProductBadges badges={badges} />}
        <PdpStockBadge stock={stock} />
        {inStock ? <ProductInventoryBadge quantity={lowStockQuantity} /> : null}
        <VariantPicker
          productOptions={productOptions}
          variants={variants}
          fallbackPrice={fallbackPrice}
          onSelectionChange={(next) => setSelection(next)}
        />
        <BnplWidget unitPriceCents={selectedPriceCents} />
        <PriceLockGuarantee productSlug={productSlug} />
        {(fabricSwatches && fabricSwatches.length > 0) || fabricSwatchError ? (
          <PdpFabricSwatches
            swatches={fabricSwatches ?? []}
            productSlug={productSlug}
            error={fabricSwatchError}
          />
        ) : null}
        {selectionComplete && !inStock && (
          <PdpNotifyMe productId={productId} />
        )}
        <div ref={primaryCtaRef} data-slot="pdp-primary-cta" className="flex flex-wrap items-center gap-3">
          <AddToCartButton {...addToCartProps} className="flex-1 min-w-0" />
          <PdpWishlistButton
            productId={productId}
            productName={productName}
            price={fallbackPriceCents / 100}
            productSlug={productSlug}
            imageUrl={fallbackImageUrl}
          />
        </div>
        <AddToCompareButton slug={productSlug} />
        <PdpWhiteGlove unitPriceCents={whiteGlovePriceCents ?? fallbackPriceCents} />
        <PdpShippingEstimate weightLbs={weightLbs} palletized={palletized} />
      </div>
      <PdpStickyCta
        visible={!primaryInView}
        productName={productName}
        formattedPrice={selectedPrice}
      >
        {(quantity, dismiss) => (
          <AddToCartButton
            {...addToCartProps}
            quantity={quantity}
            onAdded={dismiss}
          />
        )}
      </PdpStickyCta>
    </div>
  );
}
