// Resolver for derived (filter-based) PLP categories. A derived category has
// no matching Wix collection of its own — its products are sourced from a
// different collection and narrowed by a predicate. The hard-coded
// `if slug === "mattresses-sale"` branches that used to live in the PLP page
// moved here so adding a second derived category (furniture-sale, etc.) is
// a config change in categories.ts, not a code change in page.tsx.

import {
  getCollectionBySlug,
  listProductsOnSale,
  type WixProduct,
} from "@/lib/wix/products";
import type { CategoryFilter, ShopCategory } from "@/lib/shop/categories";

// Predicate dispatch table. Each entry is a reader that takes a collection id
// and returns the products passing the filter — the existing Wix helpers
// already encapsulate the predicate logic (isProductOnSale etc.).
const FILTER_READERS: Record<
  CategoryFilter,
  (collectionId: string) => Promise<readonly WixProduct[]>
> = {
  "on-sale": listProductsOnSale,
};

/**
 * Returns the prefetched product list for a derived category, or undefined if
 * the category is not derived (normal PLPs resolve via collection id, not
 * prefetched products). Returns `[]` when the source collection is missing —
 * that's a data state, not an error, and the PLP empty-state handles it.
 */
export async function resolveDerivedProducts(
  category: ShopCategory,
): Promise<readonly WixProduct[] | undefined> {
  if (!category.filter) return undefined;
  const sourceSlug = category.sourceSlug ?? category.collectionSlug;
  const sourceCollection = await getCollectionBySlug(sourceSlug);
  if (!sourceCollection?._id) return [];
  const reader = FILTER_READERS[category.filter];
  return reader(sourceCollection._id);
}
