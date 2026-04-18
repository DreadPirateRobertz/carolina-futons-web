"use client";

import { useState } from "react";

import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { PdpGallery, type GalleryImage } from "@/components/product/PdpGallery";
import { VariantPicker } from "@/components/product/VariantPicker";
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
}: PdpInteractiveProps) {
  // Intentional duplication: VariantPicker also seeds from initialSelection() and holds its own
  // selection state for price/stock display. The two stay in sync via onSelectionChange. If
  // URL-param hydration ever seeds them differently, lift selection here and make VariantPicker
  // controlled (accept selection as a prop).
  const [selection, setSelection] = useState<ChoiceSelection>(() =>
    initialSelection(productOptions, variants),
  );
  const imageUrl = getSelectedImageUrl(variants, selection, fallbackImageUrl);
  const selectedPrice = getSelectedPrice(variants, selection, fallbackPrice);
  const selectedVariant = findMatchingVariant(variants, selection);
  const selectionComplete =
    productOptions.length === 0 || isSelectionComplete(productOptions, selection);
  const inStock = selectedVariant
    ? isVariantInStock(selectedVariant)
    : variants.length === 0;
  const variantLabel = Object.entries(selection)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const disabledReason = !selectionComplete
    ? "Select options to continue"
    : !inStock
      ? "Out of stock"
      : undefined;

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
        <VariantPicker
          productOptions={productOptions}
          variants={variants}
          fallbackPrice={fallbackPrice}
          onSelectionChange={(next) => setSelection(next)}
        />
        <AddToCartButton
          productId={productId}
          productName={productName}
          variantId={selectedVariant?._id ?? undefined}
          variantLabel={variantLabel || undefined}
          options={selection}
          imageUrl={imageUrl}
          productUrl={`/products/${productSlug}`}
          unitPriceCents={fallbackPriceCents}
          formattedUnitPrice={selectedPrice}
          disabled={!selectionComplete || !inStock}
          disabledReason={disabledReason}
        />
      </div>
    </div>
  );
}
