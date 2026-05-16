/**
 * cf-g640: pure resolver for whether a PDP should suppress the
 * 15-year frame-warranty section.
 *
 * Standalone mattresses live in the Wix `mattresses` collection and
 * carry separate manufacturer warranty terms — surfacing the frame
 * warranty on a mattress PDP is an express-warranty misrepresentation
 * under NC GS 25-2-313. Futon-with-mattress bundle SKUs (e.g. a
 * loveseat futon whose SKU bundles a mattress) live in `futon-frames`,
 * NOT `mattresses`, and must keep the frame-warranty section.
 *
 * Fail-closed: when collection membership is indeterminate (Wix
 * outage, slug rename, auth expiry, SDK shape change, or a product
 * with no collectionIds at all — Wix Stores allows orphan products
 * mid-catalog-rebuild), we treat the product as a mattress and
 * suppress the section. The cost of a false suppression (frame PDP
 * missing warranty copy) is far lower than a false render (mattress
 * PDP claiming 15-year frame warranty).
 *
 * Pure — no Wix calls, no I/O. Caller pre-resolves the mattresses
 * collection (typically inside the page's Promise.all) and hands it
 * in. This separation lets the gate be unit-tested without mocking
 * the Wix client.
 */

type ProductLike = {
  collectionIds?: ReadonlyArray<string> | string[];
};

type CollectionLike = {
  _id?: string | null;
} | null;

/**
 * Resolve whether a product should be treated as a standalone
 * mattress (warranty section suppressed) for the PDP frame-warranty
 * gate.
 *
 * @param product Wix product (only `collectionIds` is read).
 * @param mattressesCollection The Wix `mattresses` collection
 *   resolved via `getCollectionBySlug("mattresses")`. Pass `null` to
 *   represent a failed lookup; the gate will fail-closed.
 * @returns `true` when this product is a standalone mattress OR when
 *   collection membership is indeterminate. `false` ONLY when we
 *   have positive proof the product is NOT in the mattresses
 *   collection.
 */
export function isStandaloneMattress(
  product: ProductLike,
  mattressesCollection: CollectionLike,
): boolean {
  const mattressesId = mattressesCollection?._id;
  // Fail-closed: indeterminate state → treat as mattress (suppress
  // warranty section). See module docstring for the legal rationale.
  if (!mattressesId) return true;
  if (product.collectionIds === undefined) return true;
  return product.collectionIds.includes(mattressesId);
}
