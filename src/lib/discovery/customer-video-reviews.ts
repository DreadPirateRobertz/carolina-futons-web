// Customer video reviews — short customer-recorded clips (e.g. "this is the
// frame in our living room") shown as a thumbnail grid below the standard
// review block on a PDP. CF-ou66.3 / cfw-9zp.
//
// Data shape matches the existing video catalogue (`src/lib/videos/catalog.ts`)
// closely enough that an embed iframe / native <video> renderer can re-use the
// same source-discriminated union, but the fields the UI cares about are
// customer-specific (author, optional rating, optional caption).
//
// The fixture below is the temporary source until a Wix CMS
// `CustomerVideoReviews` collection is provisioned (Stilgar). When the
// collection lands the loader can swap to a CMS read while keeping the same
// `CustomerVideoReview` shape — the grid component reads the prop, not the
// fixture, so neither the PDP wiring nor the tests need to change.

export type CustomerVideoReviewSource = "youtube" | "mp4";

export interface CustomerVideoReview {
  /** Stable id; survives re-orders so React keys + analytics stay aligned. */
  id: string;
  /** Slug of the product this clip is filed under — drives PDP filtering. */
  productSlug: string;
  /** Customer's display name as captured at submission time. */
  author: string;
  /** Star rating, optional — not every clip carries one. */
  rating?: 1 | 2 | 3 | 4 | 5;
  /** One-line caption shown under the thumbnail. */
  caption: string;
  /** ISO 8601 submission date. */
  date: string;
  /** Discriminator: which renderer the lightbox should use. */
  source: CustomerVideoReviewSource;
  /** Direct media URL for native playback (mp4) or canonical link (youtube). */
  videoUrl: string;
  /**
   * YouTube-only: the /embed/<id> URL that the lightbox iframe loads with
   * `autoplay=1&rel=0`. Required when source === "youtube".
   */
  embedUrl?: string;
  /** Thumbnail shown on the grid card. */
  posterUrl: string;
}

// Empty fixture by default — the section is supposed to stay hidden on PDPs
// where the CMS has nothing for the slug, and an empty list is the most
// faithful representation of "no Wix collection wired up yet". Tests build
// their own pools via the `videos` prop on the component.
export const CUSTOMER_VIDEO_REVIEWS: readonly CustomerVideoReview[] = [];

export function getCustomerVideoReviewsByProductSlug(
  slug: string,
  pool: readonly CustomerVideoReview[] = CUSTOMER_VIDEO_REVIEWS,
): readonly CustomerVideoReview[] {
  if (!slug) return [];
  return pool.filter((v) => v.productSlug === slug);
}
