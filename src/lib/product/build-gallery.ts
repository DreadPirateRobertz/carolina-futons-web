// cf-pdp-g2.fu: extracted from `src/app/products/[slug]/page.tsx` so the
// gallery-building rules are unit-testable in isolation. Folds in
// variant-level media as a third source after mainMedia + media.items[] +
// per-choice swatch media — closes the cf-pdp-g2 root cause (Wix catalogs
// that attach swatch photos at the variant level, not the choice level,
// previously left the variant URL outside `images[]` and forced the
// PdpGallery synthetic-active fallback path on every variant flip).

import type {
  ProductOptionInput,
  VariantInput,
} from "@/lib/product/variant-selection";

/** Lightweight gallery-item shape consumed by PdpGallery. */
export type GalleryImage = { url: string; alt?: string };

/** Narrow subset of the Wix product shape the gallery builder reads. */
export type GalleryProductInput = {
  media?: {
    mainMedia?: {
      title?: string | null;
      image?: { url?: string | null } | null;
    } | null;
    items?: ReadonlyArray<{
      title?: string | null;
      image?: { url?: string | null } | null;
      mediaType?: string | null;
    }> | null;
  } | null;
};

/**
 * Build the ordered gallery image list from a Wix product.
 *
 * Sources are walked in order so the thumb strip reflects the catalog's
 * own primacy ordering — main photo first, then the curated gallery
 * items, then per-choice swatch media (cfw-1nm), then per-variant media
 * (cf-pdp-g2.fu). Duplicates dropped by URL so a swatch that is also a
 * gallery item only appears once.
 *
 * The variant-media fold (last) is the cf-pdp-g2 root-cause closure:
 * Wix Stores v1 sometimes attaches the color photo to the variant rather
 * than the choice. Pre-fix those URLs lived outside `images[]`, the
 * gallery's `activeUrl`-to-index lookup returned -1, and the main image
 * silently stuck on `images[0]` until cf-pdp-g2 added a synthetic-active
 * override in PdpGallery. With this fold the variant URL lives in the
 * gallery as a real thumb, the index lookup succeeds, and the cf-pdp-g2
 * override fires far less often (it remains as defense-in-depth for
 * catalogs where neither the choice nor the variant carry media).
 *
 * @param product - Narrow Wix product shape carrying media.
 * @param productOptions - Product options with their choices' media (the
 *   cfw-1nm choice-swatch fold). Pass `undefined` if not loaded.
 * @param variants - Variants with their per-variant media (the
 *   cf-pdp-g2.fu fold). Pass `undefined` if not loaded.
 * @returns Ordered, deduplicated list of gallery images.
 */
export function buildGallery(
  product: GalleryProductInput,
  productOptions?: ReadonlyArray<ProductOptionInput>,
  variants?: ReadonlyArray<VariantInput>,
): GalleryImage[] {
  const seen = new Set<string>();
  const images: GalleryImage[] = [];

  const mainUrl = product.media?.mainMedia?.image?.url;
  if (mainUrl) {
    images.push({ url: mainUrl, alt: product.media?.mainMedia?.title ?? undefined });
    seen.add(mainUrl);
  }

  for (const item of product.media?.items ?? []) {
    if (item?.mediaType && item.mediaType !== "image") continue;
    const url = item?.image?.url;
    if (!url || seen.has(url)) continue;
    images.push({ url, alt: item.title ?? undefined });
    seen.add(url);
  }

  for (const option of productOptions ?? []) {
    for (const choice of option.choices ?? []) {
      const url = choice.media?.mainMedia?.image?.url;
      if (!url || seen.has(url)) continue;
      images.push({ url, alt: choice.description ?? choice.value ?? undefined });
      seen.add(url);
    }
  }

  // cf-pdp-g2.fu: fold in variant-level media. Alt-text is the variant's
  // option-value composition (e.g. "Color: Bryan Charcoal") when we can
  // derive it, else falls back to the variant id so screen readers still
  // get something distinguishable from the generic "image N" default.
  for (const variant of variants ?? []) {
    const url = variant?.media?.mainMedia?.image?.url;
    if (!url || seen.has(url)) continue;
    const choiceLabel = variant?.choices
      ? Object.entries(variant.choices)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")
      : "";
    images.push({
      url,
      alt: choiceLabel || (variant?._id ?? undefined) || undefined,
    });
    seen.add(url);
  }

  return images;
}
