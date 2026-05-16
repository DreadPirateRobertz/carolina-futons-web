/**
 * cf-12u4: pure resolver for the GA4 item_category dimension on PDP
 * view-item events.
 *
 * BACKGROUND
 *
 * The PDP previously sent `product.collectionIds?.[0]` to GA4 as
 * item_category. The Wix collectionIds array is unsorted (or at
 * minimum, the order is not under our control), so a mattress that
 * is ALSO in the `sale` collection could report `item_category=sale`
 * — diverging from the warranty gate (cf-g640) which uses set-
 * membership and correctly classifies the product as a mattress.
 *
 * Marketing dashboards consequently under-report mattress sales:
 * sale-eligible mattresses appear in the `sale` GA4 bucket rather
 * than the `mattresses` bucket.
 *
 * FIX
 *
 * This resolver uses the same set-membership semantic as
 * `warranty-gate.ts` but with a priority order so a multi-collection
 * product resolves to its primary category. The priority list is
 * canonical and mirrors what marketing expects to see in dashboards:
 *
 *   mattresses > futon-frames > murphy-cabinet-beds > platform-beds
 *     > sofa-beds > sale > uncategorized
 *
 * FAIL SEMANTIC
 *
 * Analytics fails SOFT (unknown → "uncategorized") in contrast to
 * the warranty gate which fails CLOSED (indeterminate → treat as
 * mattress). Different economics:
 *
 *   - Warranty gate misclassification: express-warranty
 *     misrepresentation under NC GS 25-2-313. Fail-closed.
 *   - Analytics misclassification: dashboard quirk. Fail-soft is
 *     cleaner; an unmapped GA4 event lands in `uncategorized` rather
 *     than getting force-bucketed into a default that pollutes a
 *     real category.
 *
 * Pure — no Wix calls, no I/O. Caller pre-resolves the relevant
 * collections (typically in a Promise.all alongside the warranty-
 * gate's mattresses lookup) and passes them in.
 */

type ProductLike = {
  collectionIds?: ReadonlyArray<string | null | undefined> | (string | null | undefined)[];
};

type CollectionLike = {
  _id?: string | null;
} | null;

/**
 * Map of category slug → resolved Wix collection (or null when the
 * lookup failed). Caller provides this by `Promise.all`-resolving
 * `getCollectionBySlug(<slug>)` for each category in scope.
 *
 * Missing entries are treated identically to entries with a null
 * collection (the category is unresolvable, so set-membership can't
 * match against it).
 */
export type CategoryCollectionMap = {
  mattresses?: CollectionLike;
  "futon-frames"?: CollectionLike;
  "murphy-cabinet-beds"?: CollectionLike;
  "platform-beds"?: CollectionLike;
  "sofa-beds"?: CollectionLike;
  sale?: CollectionLike;
};

/**
 * Canonical priority list. Order is load-bearing — the first match
 * wins. Aligned with marketing's expected GA4 bucket hierarchy and
 * with the warranty gate's mattresses-as-primary judgment.
 */
const CATEGORY_PRIORITY: readonly (keyof CategoryCollectionMap)[] = [
  "mattresses",
  "futon-frames",
  "murphy-cabinet-beds",
  "platform-beds",
  "sofa-beds",
  "sale",
] as const;

/**
 * GA4 item_category sentinel returned when no collection resolves.
 * Importable so callers (or GA4 audits) can compare without
 * stringly-typing the fallback.
 */
export const UNCATEGORIZED = "uncategorized";

/**
 * Resolve the GA4 item_category for a product based on its
 * collectionIds and a pre-resolved map of category collections.
 *
 * @param product Wix product (only `collectionIds` is read).
 * @param categoryMap Caller-provided map of category slug → resolved
 *   collection. Missing or null entries are treated as
 *   unresolvable (don't match).
 * @returns The first category slug from `CATEGORY_PRIORITY` whose
 *   resolved collection ID appears in `product.collectionIds`, or
 *   `"uncategorized"` if none match.
 */
export function resolveItemCategory(
  product: ProductLike,
  categoryMap: CategoryCollectionMap,
): string {
  const productCollectionIds = product.collectionIds;
  if (!productCollectionIds || productCollectionIds.length === 0) {
    return UNCATEGORIZED;
  }
  // Defensive: filter nullish entries before set-membership tests.
  // Wix SDK has yielded sparse arrays in degraded modes.
  const ids = new Set(
    productCollectionIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    ),
  );
  if (ids.size === 0) {
    return UNCATEGORIZED;
  }
  for (const category of CATEGORY_PRIORITY) {
    const collection = categoryMap[category];
    const collectionId = collection?._id;
    if (!collectionId) continue; // category lookup failed or absent
    if (ids.has(collectionId)) return category;
  }
  return UNCATEGORIZED;
}
