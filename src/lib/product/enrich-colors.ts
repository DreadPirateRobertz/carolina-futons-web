// Wix's `client.products.queryProducts()` (every PLP/home grid fetcher uses
// it) strips productOptions from its response, so the home grid can't reach
// per-product color metadata directly. Fix: read it from a denormalized
// `ProductSwatches` CMS table — one batch call instead of N getProduct calls.

import { listAllProductSwatches } from "@/lib/wix/product-swatches";
import { type ColorChoice } from "@/lib/product/color-options";
import type { WixProduct } from "@/lib/wix/products";

export type ColorChoiceMap = Map<string, ColorChoice[]>;

export async function enrichProductsWithColorChoices(
  products: ReadonlyArray<WixProduct>,
): Promise<ColorChoiceMap> {
  const map: ColorChoiceMap = new Map();
  if (products.length === 0) return map;

  const swatchesBySlug = await listAllProductSwatches();
  if (swatchesBySlug.size === 0) return map;

  for (const product of products) {
    const id = product._id;
    const slug = product.slug;
    if (!id || !slug) continue;
    const swatches = swatchesBySlug.get(slug);
    if (!swatches || swatches.length === 0) continue;
    map.set(
      id,
      swatches.map((s) => ({ label: s.name, hex: s.hex })),
    );
  }
  return map;
}
