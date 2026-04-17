"use client";

import { useState } from "react";

import { VariantPicker } from "@/components/product/VariantPicker";
import {
  getSelectedImageUrl,
  initialSelection,
  type ChoiceSelection,
  type ProductOptionInput,
  type VariantInput,
} from "@/lib/product/variant-selection";

export type PdpInteractiveProps = {
  productName: string;
  productOptions: ReadonlyArray<ProductOptionInput>;
  variants: ReadonlyArray<VariantInput>;
  fallbackImageUrl: string | undefined;
  fallbackPrice: string;
};

export function PdpInteractive({
  productName,
  productOptions,
  variants,
  fallbackImageUrl,
  fallbackPrice,
}: PdpInteractiveProps) {
  const [selection, setSelection] = useState<ChoiceSelection>(() =>
    initialSelection(productOptions, variants),
  );
  const imageUrl = getSelectedImageUrl(variants, selection, fallbackImageUrl);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <div data-slot="pdp-media">
        {imageUrl ? (
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
        <div
          data-slot="add-to-cart-placeholder"
          className="rounded-md border border-dashed border-cf-divider p-4 text-sm text-cf-espresso/60"
        >
          Add to cart arrives in the next commerce slice (cf-3qt.2.2).
        </div>
      </div>
    </div>
  );
}
