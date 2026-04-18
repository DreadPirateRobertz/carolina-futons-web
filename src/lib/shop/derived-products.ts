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
import {
  logWixFailure,
  toReaderError,
  type ReaderError,
} from "@/lib/wix/errors";
import type { CategoryFilter, ShopCategory } from "@/lib/shop/categories";

// Return shape mirrors plp.ts / cross-sell.ts / products.ts (PR #41 / #44):
// {items, error?}. Callers MUST branch on `error` before rendering the silent
// empty-state copy — derived-category empty + outage are visually identical
// otherwise, and a Wix outage masquerading as "no products on sale" is the
// exact bounce-trap class the {items, error?} contract was introduced to
// prevent (cf-3qt.6.B silent-failure review).
export type DerivedProductsResult = {
  items: readonly WixProduct[];
  error?: ReaderError;
};

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
 * Returns the prefetched product list for a derived category as
 * `{items, error?}`, or `undefined` if the category is not derived (normal
 * PLPs resolve via collection id, not prefetched products).
 *
 * Failure modes that produce `error: "unexpected"` (rather than silent `[]`):
 *   • Source collection slug doesn't resolve in Wix (config typo, deleted
 *     collection) — logged so it surfaces in Sentry instead of rendering an
 *     empty PLP forever.
 *   • Unknown filter value (CategoryFilter union widened in config without
 *     a matching reader entry) — defensive guard for the TS-bypass path.
 *   • Any unexpected throw inside the resolver — caught + tagged.
 *
 * Wix-shaped errors thrown by the underlying readers (when not already
 * swallowed by their own try/catch) get `error: "wix_sdk"`.
 */
export async function resolveDerivedProducts(
  category: ShopCategory,
): Promise<DerivedProductsResult | undefined> {
  if (!category.filter) return undefined;
  const sourceSlug = category.sourceSlug ?? category.collectionSlug;
  const op = `resolve(${category.slug})`;
  try {
    const sourceCollection = await getCollectionBySlug(sourceSlug);
    if (!sourceCollection?._id) {
      const err = new Error(
        `derived category "${category.slug}" has no source collection at slug "${sourceSlug}" — config typo, missing Wix collection, or upstream getCollectionBySlug failure`,
      );
      await logWixFailure("derived-products", op, err);
      return { items: [], error: "unexpected" };
    }
    const reader = FILTER_READERS[category.filter];
    if (!reader) {
      const err = new Error(
        `derived category "${category.slug}" uses unknown filter "${category.filter}" — CategoryFilter union widened without a matching FILTER_READERS entry`,
      );
      await logWixFailure("derived-products", op, err);
      return { items: [], error: "unexpected" };
    }
    const items = await reader(sourceCollection._id);
    return { items };
  } catch (err) {
    await logWixFailure("derived-products", op, err);
    return { items: [], error: toReaderError(err) };
  }
}
