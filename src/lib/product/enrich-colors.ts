// Server-side helper to enrich a list of products with their color choices.
//
// Background: `client.products.queryProducts()` (used by every PLP/home grid
// fetcher) strips productOptions from its response — see
// src/lib/wix/products.ts:54. The original cf-l6aj.3 wiring (#447) covered
// the gap by issuing N parallel `getProductBySlug` calls (one per card) and
// flagged it as a perf-followup.
//
// This now reads from a denormalized CMS collection instead — one batch call
// to `listAllProductSwatches()` returns a slug→swatches map, which we project
// onto the product list. One Wix Data round trip vs N getProduct round trips.
// The CMS row is the source of truth for both name and hex, so we no longer
// guess hex via colorNameToHex on the home grid.

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
