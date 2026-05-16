// cf-g640: cfw-side product-category derivation. Wix Stores carries
// `collectionIds` (opaque IDs that require a separate collection fetch
// to resolve to slug) — too heavy to call from server components on
// every PDP render. Slug-based pattern match is the pragmatic gate
// until cf-3qt.6.D.W ships a real per-product warranty-terms field.
//
// Frame products carry the 15-year hardwood warranty (PdpWarrantyInfo):
// futon frames, Murphy cabinet beds, platform beds, sofa beds. Anything
// else (mattresses, mattress covers, gift cards, parts) gets a null
// warranty surface so the user isn't promised the wrong terms.

const FRAME_SLUG_PATTERNS: readonly RegExp[] = [
  // Futon frames (most common — covers "kingston-futon-frame",
  // "asheville-futon", "futon-cody", etc).
  /\bfuton\b/i,
  // Murphy cabinet beds.
  /\bmurphy\b/i,
  // Platform beds (allow "platform-bed", "platform_bed", "platform bed").
  /platform[-_ ]?bed/i,
  // Sofa beds + sofa-frame variants.
  /sofa[-_ ]?bed/i,
  // Daybed frames.
  /\bdaybed\b/i,
];

/**
 * Returns true when the product slug matches a known frame-category
 * pattern. Conservative by design — a future product type that ships
 * without matching the patterns will not surface the 15-year warranty
 * (which is correct: if we don't know it's a frame, don't promise a
 * frame warranty).
 *
 * @param slug Wix Stores product slug.
 */
export function isFrameProduct(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return FRAME_SLUG_PATTERNS.some((p) => p.test(slug));
}
