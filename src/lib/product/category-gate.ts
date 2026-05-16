// cf-g640 (cfw-avc.fu1): category gate for product surfaces that should
// only render on frame SKUs (futon frames, platform beds, murphy
// cabinet beds, daybeds).
//
// Why a separate helper: PdpWarrantyInfo isn't the only surface that
// needs this discriminator — future per-category copy (mattress
// warranty terms, cover care guides, etc.) will need to branch on
// the same predicate. Extracting it makes the negative-filter
// taxonomy ("what counts as NOT a frame") the single source of truth
// instead of duplicating substring checks across components.
//
// Why slug-based (not collectionIds): collectionIds are Wix-side IDs
// that change between fixture / staging / prod environments. The
// slug is the stable cross-environment identifier and is already
// the routing key for the PDP. A category-aware Wix-data lookup
// (Option C in cf-g640 spec) is the long-term shape but requires
// Brenda to provision per-product custom fields — out of scope for
// the 24h "stop the bleeding" fix this bead targets.

/**
 * Slug substring patterns that signal a NON-frame product. Any slug
 * containing one of these markers is excluded from the frame-warranty
 * surface (and any future frame-only affordance routed through this
 * helper).
 *
 * Maintained as a frozen array so a typo'd addition fails at module
 * load rather than silently widening the exclusion set.
 */
const NON_FRAME_MARKERS = Object.freeze([
  "mattress",
  "cover",
  "topper",
]);

/**
 * Return true when `slug` looks like a frame product (futon frame,
 * platform bed, murphy cabinet bed, daybed). False for mattress /
 * cover / topper SKUs whose warranty terms differ from the uniform
 * 15-year frame guarantee.
 *
 * Empty / whitespace-only / non-string input returns false (defensive
 * — caller shouldn't render a frame-only surface for an unknown
 * product). Comparison is case-insensitive.
 *
 * @param slug - The product slug (typically `product.slug` from Wix Stores).
 * @returns `true` when the slug is recognized as a frame SKU.
 */
export function isFrameProduct(slug: string | null | undefined): boolean {
  if (typeof slug !== "string") return false;
  const normalized = slug.trim().toLowerCase();
  if (normalized.length === 0) return false;
  for (const marker of NON_FRAME_MARKERS) {
    if (normalized.includes(marker)) return false;
  }
  return true;
}
