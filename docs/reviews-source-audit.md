# Reviews Source & UGC Gallery Audit

**Bead:** cfw-tm9
**Audited:** 2026-05-04
**Origin:** Stilgar walkthrough 2026-05-04 ~21:50 MT — "Reviews should pull from Google. Where's the user gallery?"

## TL;DR

| Surface | Today | Should be |
| --- | --- | --- |
| Homepage `TestimonialsStrip` | Hardcoded editorial array (3 quotes) | Acceptable as editorial; not customer reviews |
| PDP reviews + `/reviews` page | Hardcoded `REVIEWS` fixture (6 entries) | **Google Business Profile** (or Wix CMS, then Google) |
| PLP / featured "stars + count" | Hardcoded `SEED` map keyed by product slug | Aggregated from real source |
| Community gallery | **Exists** at `/community-gallery`, backed by Wix `CommunityPhotos` collection | Keep — wire submit CTA from PDP |
| "Share Your Photo" submit CTA | Only on `/community-gallery` | **Surface from PDP** as well |

## 1. Customer reviews — current source

There is **no live review integration**. Every visible review is a build-time constant:

- `src/components/site/TestimonialsStrip.tsx:18-37` — `TESTIMONIALS` array of 3 editorial quotes, intentionally static. Comment in file says "static by design — these are editorial highlights, not a live review feed". Acceptable for that surface as long as it is positioned as editorial.
- `src/components/product/PdpReviews.tsx:8,49-50` — imports `REVIEWS` from `src/lib/discovery/reviews.ts:24-85`. Six hand-written review objects matched to product names → categories. Falls back to empty.
- `src/app/reviews/page.tsx:4,19` — same `REVIEWS` array, rendered with `averageRating()` aggregation.
- `src/lib/product/review-stats.ts:8-15` — `SEED` mapping `{ slug → { rating, count } }` for six products. Returns `null` for unseeded slugs and logs a console warning.

There is **no** code path that calls Google Business Profile, Stamped.io, Yotpo, Bazaarvoice, or a Wix `Reviews` collection. No `googleapis`, `places`, `stamped`, or `yotpo` dependency in `package.json`.

### Migration target

Stilgar wants reviews pulled from **Google Reviews** (Google Business Profile API for the Hendersonville location). High-level path:

1. Provision Google Business Profile API credentials and OAuth flow (or use a service-account if GBP allows for the location).
2. New server-side fetcher under `src/lib/reviews/google-reviews.ts` that calls `mybusinessbusinessinformation.locations.list` + `mybusinessreviews.accounts.locations.reviews.list`, normalizes to a `Review` shape compatible with `PdpReviews` and the `/reviews` page.
3. Cache via Next.js `unstable_cache` / `revalidate: 86400` to stay under quota and survive transient outages.
4. Replace the `REVIEWS` constant with the live fetcher; keep the fixture as a Vitest seed.
5. Aggregate per-product ratings: GBP reviews are location-level, not product-level. Either (a) drop product-specific ratings on PLP/featured tiles and show a single location star average, or (b) layer a Wix `ProductReviews` collection on top of GBP for product-level scores. Pick (a) for v1 — Stilgar's ask is reviews source, not granularity.

Follow-up bead filed: see *Recommendations* below.

## 2. UGC photo gallery

A gallery already ships:

- Route: `src/app/community-gallery/page.tsx` — title "Community Gallery — Carolina Futons", ISR 1h (line 20).
- Data source: `src/lib/wix/community-gallery.ts:43-69` — `wixClient.items.query("CommunityPhotos").limit(60).find()`. Fields: `image`, `customerName`, `location`, `productSlug`, `caption`. Drops invalid rows silently; on network error returns `{ photos: [], error: "wix_sdk" }`.
- Layout: masonry `columns-1 sm:columns-2 lg:columns-3 xl:columns-4` (lines 94-102).

This satisfies Stilgar's "user gallery" ask. No new gallery surface needed.

## 3. "Share Your Room" / "Share Your Photo" submit CTA

- The CTA text in code is **"Share your photo"**, not "Share your room". Confirm with Stilgar whether the bead's wording or the code's wording wins.
- CTA renders on `src/app/community-gallery/page.tsx:124-132` only — it is **not** on PDPs today.
- Submit page: `src/app/community-gallery/submit/page.tsx` → `PhotoSubmitForm` (`src/components/gallery/PhotoSubmitForm.tsx`).
- Server action `submitCommunityPhoto` (`src/app/community-gallery/actions.ts:14-47`) POSTs JSON to Wix Velo `${WIX_VELO_SITE_URL}/_functions/submitCommunityPhoto`. Persistence + moderation live entirely in the Wix Velo backend; the Next.js codebase has no admin/approval UI.

### Gap

The hookup-guide / Stilgar context says PDPs already have a "Share Your Room" CTA. They don't. The CTA only exists on the gallery page itself, which means a customer who finishes a purchase has no on-PDP nudge to upload a photo. Highest-leverage entry point is the PDP cross-sell / post-purchase area.

## Recommendations / follow-up beads

1. **cfw-49h** — Migrate reviews source to Google Business Profile API. Owner: melania to route. Scope: provision GBP credentials, write `src/lib/reviews/google-reviews.ts`, replace `REVIEWS` import sites, location-level aggregation v1.
2. **cfw-0ty** — Surface "Share Your Photo" CTA on PDP. Owner: melania to route. Scope: render a CTA on `src/components/product/PdpReviews.tsx` linking to `/community-gallery/submit?productSlug=…`. Settle naming ("Share Your Room" per bead/hookup guide vs "Share Your Photo" per code) as part of this bead.
3. **(Optional, not filed)** Audit the Wix Velo `submitCommunityPhoto` function to verify it logs submissions, validates image URLs before storage, and runs moderation before photos appear publicly. Currently opaque from the Next.js side. Owner candidate: carolina-futons (Velo) app worker.
