// Static review stats for PLP/featured cards and the PDP aggregate. Returns
// null when no real stats exist for the slug — callers must conditionally
// render. The previous deterministic-hash fallback (cf-xe54) was removed
// because it minted plausible-looking 4.7★ aggregates for any unknown slug,
// which was being surfaced verbatim to shoppers.
export type ReviewStats = { rating: number; count: number };

const SEED: Record<string, ReviewStats> = {
  "monterey-futon": { rating: 4.9, count: 42 },
  "natural-hardwood-platform-bed": { rating: 4.8, count: 31 },
  "murphy-cabinet-bed": { rating: 4.7, count: 18 },
  "classic-8-inch-mattress": { rating: 4.8, count: 56 },
  "coastal-futon-cover": { rating: 4.6, count: 24 },
  "hardwood-bed-frame": { rating: 4.9, count: 37 },
};

export function getReviewStats(slug: string | undefined): ReviewStats | null {
  if (!slug) return null;
  const seeded = SEED[slug];
  if (seeded) return seeded;
  if (process.env.NODE_ENV !== "test") {
    console.warn(`[review-stats] unseeded slug "${slug}" — no aggregate emitted`);
  }
  return null;
}
