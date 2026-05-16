// cf-g640 (cfw-avc.fu1): predicate gating the PdpWarrantyInfo render.
//
// The 15-year frame warranty surfaced by `<PdpWarrantyInfo />` only
// covers frame-class products. Mattresses and covers carry separate
// manufacturer terms documented on `/warranty`; rendering the frame
// warranty section on those PDPs creates real customer-facing risk
// (warranty claims denied 4 years out because the PDP misrepresented
// coverage at point-of-sale).
//
// Design: slug-based allowlist with conservative fallthrough. Returns
// `true` only for known frame-class slug shapes (futon / Murphy / platform
// / sofa-bed); returns `false` for everything else including unknown
// SKUs. The asymmetric failure mode is intentional — silently omitting
// the warranty section on a future-renamed frame ("customer can find
// /warranty in the footer") is recoverable; misclassifying a mattress
// as a frame ("denied claim 4 years later") is not.
//
// Long-term direction: when Wix Stores grows a per-product
// `warrantyYears` / `warrantyType` custom field (cf-3qt.6.D.W), the
// gate should source from the SKU directly. Until then, slug shape is
// the most reliable signal cfw has access to without a lookup.

const FRAME_SLUG_SHAPES = [
  /\bfuton(?:s|-frame|-frames)?\b/i,
  /\bmurphy(?:-cabinet)?(?:-bed|-beds)?\b/i,
  /\bplatform-bed(?:s)?\b/i,
  /\bsofa-?bed(?:s)?\b/i,
];

/**
 * Returns `true` when the product slug matches a known frame-class
 * shape and therefore qualifies for the uniform 15-year frame
 * warranty surfaced by `<PdpWarrantyInfo />`.
 *
 * @param slug Product slug (URL segment, conventionally lowercase).
 * @returns `true` for frame-class slugs; `false` for mattresses,
 *   covers/slipcovers, accessories, empty/whitespace input, and any
 *   slug shape not explicitly allowlisted.
 *
 * See {@link FRAME_SLUG_SHAPES} for the allowlist patterns. Match is
 * case-insensitive to defend against future slug-casing drift.
 */
export function qualifiesForFrameWarranty(slug: string): boolean {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return false;
  // Cover / slipcover slugs frequently embed "cover" alongside frame
  // tokens (e.g. "twin-mattress-cover"). Reject these first so the
  // allowlist can't accidentally promote them.
  if (/\b(?:cover|slipcover)\b/.test(normalized)) return false;
  // Mattress slugs are rejected before allowlist check for the same
  // reason — "mesa-1000-mattress" must NOT be captured by any frame
  // pattern that includes a substring overlap.
  if (/\bmattress(?:es)?\b/.test(normalized)) return false;
  return FRAME_SLUG_SHAPES.some((re) => re.test(normalized));
}
