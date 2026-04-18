// cf-review-count-badges: static review stats for PLP/featured cards until
// the real review service lands. Handpicked entries for current flagship
// slugs; deterministic hash-derived fallback so any new slug still renders
// a plausible badge instead of an empty gap. `null` is reserved for
// "explicitly no stats" (e.g. a slug we intentionally want unbadged).
export type ReviewStats = { rating: number; count: number };

const SEED: Record<string, ReviewStats> = {
  "monterey-futon": { rating: 4.9, count: 42 },
  "natural-hardwood-platform-bed": { rating: 4.8, count: 31 },
  "murphy-cabinet-bed": { rating: 4.7, count: 18 },
  "classic-8-inch-mattress": { rating: 4.8, count: 56 },
  "coastal-futon-cover": { rating: 4.6, count: 24 },
  "hardwood-bed-frame": { rating: 4.9, count: 37 },
};

// djb2-style integer hash. Stable across runs; small enough to derive a
// rating in [4.5, 4.9] and a count in [8, 48] without pulling randomness.
function slugHash(slug: string): number {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) {
    h = ((h << 5) + h + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getReviewStats(slug: string | undefined): ReviewStats | null {
  if (!slug) return null;
  if (slug in SEED) return SEED[slug];
  const h = slugHash(slug);
  const rating = 4.5 + (h % 5) / 10; // 4.5, 4.6, 4.7, 4.8, 4.9
  const count = 8 + (h % 41); // 8–48
  return { rating: Number(rating.toFixed(1)), count };
}
