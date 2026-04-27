"use client";

import { useEffect, useRef, useState } from "react";

import {
  AddToCartButton,
  type AddToCartButtonProps,
} from "@/components/cart/AddToCartButton";
import { PdpGallery, type GalleryImage } from "@/components/product/PdpGallery";
import { PdpShippingEstimate } from "@/components/product/PdpShippingEstimate";
import { PdpStickyCta } from "@/components/product/PdpStickyCta";
import { PdpStockBadge } from "@/components/product/PdpStockBadge";
import { PdpFabricSwatches } from "@/components/product/PdpFabricSwatches";
import { PdpWhiteGlove } from "@/components/product/PdpWhiteGlove";
import { PdpWishlistButton } from "@/components/product/PdpWishlistButton";
import { VariantPicker } from "@/components/product/VariantPicker";
import type { StockBadgeInput } from "@/lib/product/stock-badge-state";
import type { SwatchItem } from "@/lib/swatch-request/swatch-request-schema";
import {
  findMatchingVariant,
  getSelectedImageUrl,
  getSelectedPrice,
  initialSelection,
  isSelectionComplete,
  isVariantInStock,
  type ChoiceSelection,
  type ProductOptionInput,
  type VariantInput,
} from "@/lib/product/variant-selection";

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
  galleryImages?: ReadonlyArray<GalleryImage>;
  stock?: StockBadgeInput | null;
  fabricSwatches?: SwatchItem[];
  fabricSwatchError?: boolean;
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
  galleryImages,
  stock,
  fabricSwatches,
  fabricSwatchError,
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

  const imageUrl = getSelectedImageUrl(variants, selection, fallbackImageUrl);
  const selectedPrice = getSelectedPrice(variants, selection, fallbackPrice);
  const selectedVariant = findMatchingVariant(variants, selection);
  const selectionComplete =
    productOptions.length === 0 || isSelectionComplete(productOptions, selection);
  const inStock = resolveInStock(selectedVariant, productOptions, stock);
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
    unitPriceCents: fallbackPriceCents,
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
          />
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={productName}
            data-testid="pdp-main-image"
            className="aspect-square w-full rounded-lg object-cover"
          />
        ) : (
          <div className="aspect-square w-full rounded-lg bg-cf-sand" />
        )}
      </div>
      <div data-slot="pdp-details" className="space-y-6">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-cf-espresso">
          {productName}
        </h1>
        <PdpStockBadge stock={stock} />
        <VariantPicker
          productOptions={productOptions}
          variants={variants}
          fallbackPrice={fallbackPrice}
          onSelectionChange={(next) => setSelection(next)}
        />
        {(fabricSwatches && fabricSwatches.length > 0) || fabricSwatchError ? (
          <PdpFabricSwatches
            swatches={fabricSwatches ?? []}
            productSlug={productSlug}
            error={fabricSwatchError}
          />
        ) : null}
        <div ref={primaryCtaRef} data-slot="pdp-primary-cta" className="flex flex-wrap items-center gap-3">
          <AddToCartButton {...addToCartProps} />
          <PdpWishlistButton
            productId={productId}
            productName={productName}
            price={fallbackPriceCents / 100}
            productSlug={productSlug}
            imageUrl={fallbackImageUrl}
          />
        </div>
        <PdpWhiteGlove unitPriceCents={fallbackPriceCents} />
        <PdpShippingEstimate />
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
