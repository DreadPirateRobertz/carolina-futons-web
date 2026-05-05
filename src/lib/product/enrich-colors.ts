// Server-side helper to enrich a list of products with their color choices.
//
// `client.products.queryProducts()` (used by all PLP/home grid fetchers)
// strips productOptions from its response — see src/lib/wix/products.ts:54.
// To show "Available in N colors" + swatch dots on cards we need the full
// product, which only `getProductBySlug` returns. We parallel-batch one
// getProduct per slug, cached per slug, and assemble a Map<productId, ColorChoice[]>.
//
// Cost note: for 24 home cards this is 24 getProduct calls behind the cache.
// First render is slower; cached renders are fast. If catalog growth makes
// this too expensive, the right next move is a denormalized "color count" field
// on a CMS collection joined into the queryProducts response.

import { getProductBySlug } from "@/lib/wix/products";
import {
  extractColorChoices,
  type ColorChoice,
} from "@/lib/product/color-options";
import type { WixProduct } from "@/lib/wix/products";

export type ColorChoiceMap = Map<string, ColorChoice[]>;

export async function enrichProductsWithColorChoices(
  products: ReadonlyArray<WixProduct>,
): Promise<ColorChoiceMap> {
  const map: ColorChoiceMap = new Map();
  // Run getProductBySlug in parallel — Wix SDK handles the concurrency, and
  // for typical home grids (<=24 products) the request fan-out is bounded.
  await Promise.all(
    products.map(async (p) => {
      if (!p._id || !p.slug) return;
      const full = await getProductBySlug(p.slug);
      if (!full) return;
      const choices = extractColorChoices(full);
      if (choices.length > 0) map.set(p._id, choices);
    }),
  );
  return map;
}
