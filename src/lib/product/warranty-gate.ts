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

// cf-tmdb (cf-g640.fu4): merchandiser-mistake detector for the operator
// side. `isStandaloneMattress` correctly suppresses the warranty section
// when a product is in the mattresses collection — but it does this
// SILENTLY, with no signal to on-call when the membership looks
// suspicious. A common merchandiser mistake: tagging a frame-shaped
// product into the mattresses collection (e.g. "Kingston Futon Frame"
// accidentally added to `mattresses` during catalog reorg). With
// `isStandaloneMattress` alone, that PDP loses its warranty section
// silently, all tests stay green, the bug persists until someone
// notices the missing warranty copy in production.
//
// `looksLikeFrameByShape(slug)` returns true if the product slug
// contains tokens that strongly suggest the product is a frame.
// Wire it via `flagSuspiciousMattressMembership` at the PDP page:
// when isStandaloneMattress + looksLikeFrameByShape both fire, emit
// a Sentry breadcrumb so an operator can investigate the merchandiser
// tagging.

// Frame-shape tokens. Conservative — only includes tokens that are
// unambiguous frame indicators in the cfutons catalog. Generic words
// like "bed" alone are too noisy (mattresses also use "bed"-shaped
// names like "bed-pillow-topper").
const FRAME_SHAPE_TOKENS = [
  /\bfuton\b/i,
  /\bmurphy\b/i,
  /\bplatform-bed\b/i,
  /\bsofa-?bed\b/i,
  /\bloveseat\b/i,
];

/**
 * Heuristic: does the product slug contain tokens that suggest the
 * product is a frame? Used by {@link flagSuspiciousMattressMembership}
 * to detect a likely merchandiser miscategorization.
 *
 * Conservative — only true for unambiguous frame tokens.
 *
 * @param slug Product slug (URL segment, conventionally lowercase).
 * @returns `true` when at least one frame-shape token matches.
 */
export function looksLikeFrameByShape(slug: string): boolean {
  if (!slug) return false;
  return FRAME_SHAPE_TOKENS.some((re) => re.test(slug));
}

/**
 * Detect a likely merchandiser tagging mistake: product is in the
 * mattresses collection (per {@link isStandaloneMattress}) AND its slug
 * contains frame-shape tokens (per {@link looksLikeFrameByShape}).
 *
 * The legitimate case is a futon-with-mattress bundle SKU — but those
 * are merchandised in `futon-frames`, not `mattresses`. A product
 * named "Kingston Futon Frame" in the mattresses collection is almost
 * certainly a tagging mistake.
 *
 * Pure — no I/O. Caller wires the Sentry breadcrumb (see PDP page).
 *
 * @param product Same shape as {@link isStandaloneMattress} accepts.
 * @param mattressesCollection Same as {@link isStandaloneMattress}.
 * @param slug Product slug.
 * @returns `true` ONLY when isStandaloneMattress(product, coll) is true
 *   AND looksLikeFrameByShape(slug) is true. Both conditions required
 *   so the signal doesn't fire on legitimate mattress SKUs.
 */
export function flagSuspiciousMattressMembership(
  product: ProductLike,
  mattressesCollection: CollectionLike,
  slug: string,
): boolean {
  if (!isStandaloneMattress(product, mattressesCollection)) return false;
  return looksLikeFrameByShape(slug);
}
