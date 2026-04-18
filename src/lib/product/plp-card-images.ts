// PLP card image resolver: picks the primary (rest state) and secondary
// (hover/focus state) images for a ProductCard tile. The secondary image
// enables the Phase 7 hover-swap microinteraction; when the product has
// only one distinct image, secondary is null so the card falls back to
// motion-only affordance (scale/translate) with no flash.
//
// Source order mirrors the PDP gallery builder in app/products/[slug]/page.tsx:
//   1. media.mainMedia → primary
//   2. First media.items[] image whose URL differs from primary → secondary
// Non-image media (video, etc.) and null URLs are skipped. This keeps the
// hover swap defensive: the card never tries to cross-fade to a missing or
// non-image URL.

export type PlpCardMediaProduct = {
  media?: {
    mainMedia?: { image?: { url?: string | null } | null } | null;
    items?: ReadonlyArray<{
      image?: { url?: string | null } | null;
      mediaType?: string | null;
    } | null> | null;
  } | null;
};

export type PlpCardImages = {
  primary: string | null;
  secondary: string | null;
};

export function getPlpCardImages(product: PlpCardMediaProduct): PlpCardImages {
  const primary = product.media?.mainMedia?.image?.url ?? null;
  const items = product.media?.items ?? [];

  for (const item of items) {
    if (!item) continue;
    if (item.mediaType && item.mediaType !== "image") continue;
    const url = item.image?.url;
    if (!url) continue;
    if (url === primary) continue;
    return { primary, secondary: url };
  }

  return { primary, secondary: null };
}
