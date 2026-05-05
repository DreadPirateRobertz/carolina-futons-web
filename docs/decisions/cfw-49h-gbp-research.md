# cfw-49h — Google Business Profile reviews migration: research & plan

**Status:** Research, not implementation. Output of cfw-13y. Hand-off target: cfw-49h (guzzle).
**Audited from:** `feat/cfw-13y-gbp-research` branch off `main` @ `f44a9ef`.
**Author:** blaidd (cfutons/crew)
**Date:** 2026-05-05

## 1. Audit confirmation (re: cfw-tm9)

The cfw-tm9 finding still holds: **no live review integration ships today**.

| Surface | Source | File / line |
| --- | --- | --- |
| Home `TestimonialsStrip` | 3 hand-written editorial quotes (`TESTIMONIALS` const) | `src/components/site/TestimonialsStrip.tsx:18-37` |
| PDP review block | 6-row `REVIEWS` fixture, name-matched to product → category | `src/components/product/PdpReviews.tsx:8`, `src/lib/discovery/reviews.ts:24-85` |
| `/reviews` page | Same `REVIEWS` fixture + `averageRating()` | `src/app/reviews/page.tsx:4,19` |
| PLP / featured "stars + count" tiles | `SEED` map keyed by 6 product slugs; logs warning + returns `null` for unseeded slugs | `src/lib/product/review-stats.ts:8-15` |

Nothing imports `googleapis`, `places`, `stamped`, or `yotpo`. `package.json` carries no review-API dependency. The home-page `TestimonialsStrip` comment ("static by design — these are editorial highlights, not a live review feed") is accurate; that surface stays editorial regardless of which API we adopt.

## 2. The two viable Google paths

### Path A — Business Profile Reviews API (canonical)

Endpoint: `GET https://mybusiness.googleapis.com/v4/{parent=accounts/*/locations/*}/reviews`
Docs: <https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list>

- **Returns**: every review on the GBP location, paged (≤ 50 per page), orderable by `rating` / `rating desc` / `updateTime desc`.
- **Per-review shape** (per `Review` resource): `reviewId`, `reviewer.displayName`, `reviewer.profilePhotoUrl`, `starRating` (enum `ONE…FIVE`), `comment` (free-form text — may be empty for star-only reviews), `createTime`, `updateTime`, `reviewReply.{comment,updateTime}`, `name`.
- **Auth**: OAuth 2.0 with `https://www.googleapis.com/auth/business.manage`. Service-account use is **not documented**. Practical implication: a stored refresh token belonging to an owner/manager of the Hendersonville GBP location, exchanged server-side for a 1-hour access token.
- **Allowlist requirement (the catch)**: Google requires a *manual* application (<https://developers.google.com/my-business/content/prereqs>). Pre-approval the project sits at **0 QPM**; approval lifts it to **300 QPM**. Required: GBP verified & active 60+ days, business website listed on the GBP, application submitted by an owner-listed email. Lead time is not published — community reports range from days to several weeks.
- **Rate limits**: 300 QPM after approval. Easily within reach if cached aggressively (see §4).

### Path B — Places API (Place Details, "Atmosphere" tier)

Endpoint: Place Details (new): <https://developers.google.com/maps/documentation/places/web-service/place-details>

- **Returns**: up to **5 most-relevant reviews** per Place ID. No paging, no full history.
- **Per-review shape**: `name`, `rating`, `text.text`, `text.languageCode`, `originalText.text`, `authorAttribution.{displayName,uri,photoUri}`, `publishTime`, `relativePublishTimeDescription`. Schema: <https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places#Review>.
- **Auth**: simple API key, header `X-Goog-Api-Key`. No OAuth, no allowlist beyond enabling the Places API and accepting Maps Platform billing.
- **Aggregate**: `rating` (location average) and `userRatingCount` are top-level fields, available without expanding `reviews`.
- **Cost**: SKU-billed; falls under "Place Details (Enterprise + Atmosphere)". Free tier covers $200/mo of Maps Platform usage at retail rates. With caching this never registers.
- **Limit**: only the 5 surfaced reviews — Google curates "most-relevant". Useful for social-proof tiles + a hand-picked PDP rotation; insufficient if Stilgar wants every review on `/reviews`.

### Recommendation

**Ship Path B today, apply for Path A in parallel.**

Path B unblocks the home / PDP / PLP rating UI immediately with a real average + 3-5 fresh quotes, and survives the multi-week GBP allowlist limbo. Path A swap, when approval lands, is a fetcher-internal change — nothing in the consuming components needs to move if we keep the normalized `Review` shape stable.

If Stilgar insists on the full review feed on `/reviews` from day one, Path B alone won't satisfy that surface — call this out in §6 open questions.

## 3. Data shape mapping

The existing consumers (`PdpReviews`, `/reviews`, `review-stats`) all expect a shape compatible with `src/lib/discovery/reviews.ts`. Keep that contract; introduce a normalizer for the chosen source.

```ts
// src/lib/reviews/types.ts (new)
export type Review = {
  id: string;
  authorName: string;
  authorAvatarUrl?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;          // empty string for star-only reviews
  createdAt: string;     // ISO8601
  source: "google";      // future: "wix" | "stamped"
};

export type LocationRatingSummary = {
  averageRating: number;       // 0-5, one decimal
  totalReviewCount: number;
  source: "google";
  fetchedAt: string;           // ISO8601, for cache transparency
};
```

### Path B → Review (Places)

```ts
{
  id: r.name,                           // resource path, opaque
  authorName: r.authorAttribution.displayName,
  authorAvatarUrl: r.authorAttribution.photoUri,
  rating: r.rating,                     // already 1-5 int
  body: r.originalText?.text ?? r.text.text ?? "",
  createdAt: r.publishTime,             // ISO already
  source: "google",
}
```

### Path A → Review (GBP, when allowlist lands)

```ts
{
  id: r.reviewId,
  authorName: r.reviewer.displayName,
  authorAvatarUrl: r.reviewer.profilePhotoUrl,
  rating: STAR_TO_INT[r.starRating],    // ONE → 1 ... FIVE → 5
  body: r.comment ?? "",
  createdAt: r.createTime,
  source: "google",
}
```

`reviewReply` is intentionally dropped from v1 — surfaces don't render owner replies today. Add `ownerReply?: { body, repliedAt }` to the type later if/when a "merchant response" UI lands.

## 4. Caching layer

Both paths must be cached aggressively or we burn quota on every page render.

**Recommendation: Next.js `unstable_cache` (App Router) keyed by (`location`, `path`), with `revalidate: 21600` (6 hours)** and `tags: ["google-reviews"]` so an admin-triggered `revalidatePath("/reviews")` or `revalidateTag("google-reviews")` can force a refresh.

Why not Vercel Runtime Cache directly: the project already standardizes on `unstable_cache` + tag-based revalidation (e.g. `src/lib/wix/products.ts`, `src/lib/discovery/*`). Adding a second cache primitive complicates ops without buying anything for this read pattern.

Why not Edge Config: Edge Config is for tiny, write-rare config payloads (<8KB total). A growing review feed will exceed that and is the wrong fit semantically.

Stale-while-revalidate falls out of `unstable_cache`'s default behavior — a stale entry continues to serve while the next render kicks off the refetch. Combined with the env-fallback below, this gives us a 3-layer safety net.

### Failure modes

| Condition | Behavior |
| --- | --- |
| `GOOGLE_PLACES_API_KEY` (or `GOOGLE_GBP_REFRESH_TOKEN`) unset | Fetcher returns `null`. Consumers fall back to the existing `REVIEWS` fixture. **Same pattern as `WIX_VELO_SITE_URL` env-fallback in `src/app/api/notify-me/route.ts` and the new cfw-98s `/api/newsletter`.** Lets previews / CI run without secrets. |
| API 4xx/5xx | Fetcher logs + returns `null`. Cache holds the previous good payload via `unstable_cache`'s default. After `revalidate` window, on next failure consumers see fixture fallback. |
| Empty `reviews` array (legitimately zero reviews) | Fetcher returns `{ reviews: [], summary: {…} }` — UI hides the section. Distinct from `null` (= we couldn't fetch). |
| Approval pending on Path A | Fetcher gets 403; cache the *negative* with a short TTL (e.g. 5 minutes) so we don't hammer until approval flips. |

## 5. First-load behavior while the cache is cold

The `/reviews` route is RSC-rendered. First request after a cold deploy will hit the fetcher synchronously. Two mitigations:

1. **Build-time pre-warm.** Run the fetcher inside `generateStaticParams` (or a top-level Next 16 `cache()` call in the layout) so the cache is hot at deploy time. Acceptable since the page already opts in to ISR.
2. **Optimistic fallback.** Always render the existing `REVIEWS` fixture if the live fetcher returns `null` *and* we're on the first request. Belt-and-braces with §4.

For PLP / featured tiles, the live `LocationRatingSummary` replaces the per-product `SEED` average — but **only at the location level**. v1: drop product-specific star tiles, show one site-wide "★ 4.X (N reviews) on Google" badge. Re-introduce per-product later via a Wix `ProductReviews` collection (out of scope for cfw-49h).

## 6. Open questions for Stilgar / Brenda

1. **Aggregation level.** v1 shows a single location-wide star average everywhere. Acceptable, or do PLP tiles need per-product ratings on day one? (The latter requires either Wix `ProductReviews` or a second source — multi-bead scope.)
2. **`/reviews` page completeness.** If we ship Path B first, that page only shows up to 5 quotes. Is that acceptable for the gap between Path B launch and Path A allowlist approval, or do we need the existing fixture to remain visible alongside?
3. **Owner reply rendering.** GBP exposes merchant replies. Do we want them visible in v1, or hold for a follow-up?
4. **Review filtering.** Suppress 1-star reviews? Suppress reviews without `body`? Recommend: surface every review verbatim — selective filtering reads as astroturfing if anyone notices.
5. **Refresh ownership.** Once cached for 6 hours, who decides when to force a manual refresh? Recommend: tag-based revalidation hook in the same admin surface that already exists for product cache busting.

## 7. Hand-off to cfw-49h (guzzle)

Concrete next steps for the implementation bead. None of these are research-blocked.

1. **Provision** `GOOGLE_PLACES_API_KEY` in Vercel (preview + production), restricted to the Hendersonville Place ID by API key restrictions. Document in `docs/SITE-OWNER-GUIDE.md` env table.
2. **Enable Places API (New)** in the existing `cf-prod` GCP project; accept Maps Platform billing terms.
3. **Create** `src/lib/reviews/google-places.ts`:
   - Resolve Place ID once at startup and cache it (env or `lib/business/contact-info.ts`).
   - `fetchPlaceReviews(): Promise<{ reviews: Review[]; summary: LocationRatingSummary } | null>` wrapped in `unstable_cache` with `revalidate: 21600`, `tags: ["google-reviews"]`.
   - Normalizer per §3.
4. **Create** `src/lib/reviews/types.ts` with the canonical `Review` + `LocationRatingSummary` shapes.
5. **Replace** `REVIEWS` import sites:
   - `PdpReviews`: render up to N normalized reviews, fall back to fixture if fetcher returns `null`.
   - `/reviews/page.tsx`: same.
   - `review-stats.ts`: replace per-slug `SEED` lookup with location-level summary; emit `null` for unseeded path so the UI hides cleanly.
6. **Tests** (Vitest):
   - `google-places.test.ts` — record a real Places response, assert the normalizer output matches the fixture shape; verify env-fallback returns `null`; verify 4xx → `null` + log.
   - Update `PdpReviews.test.tsx` and `reviews-page.test.tsx` to mock the fetcher and assert the fixture-fallback branch.
7. **Apply** for GBP API access (path A) in parallel — `mailto:` template ready in the prereqs page. Once approved, write `src/lib/reviews/google-gbp.ts` behind the same `Review` shape and toggle the source via `NEXT_PUBLIC_REVIEWS_SOURCE=places|gbp` (or just swap once and delete the Places fetcher; Path B was the bridge).

### Touch-points (full file list for guzzle)

```
NEW    src/lib/reviews/types.ts
NEW    src/lib/reviews/google-places.ts
NEW    src/lib/reviews/__tests__/google-places.test.ts
NEW    src/lib/reviews/google-gbp.ts            (after allowlist)
EDIT   src/components/product/PdpReviews.tsx     (consume new fetcher + fallback)
EDIT   src/app/reviews/page.tsx                  (consume new fetcher + fallback)
EDIT   src/lib/product/review-stats.ts           (location-level summary or remove)
EDIT   src/lib/discovery/reviews.ts              (downgrade from runtime source to test fixture)
EDIT   docs/SITE-OWNER-GUIDE.md                  (env-table entry for GOOGLE_PLACES_API_KEY)
```

## 8. References

- GBP Reviews API list endpoint — <https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list>
- GBP API access prerequisites & application — <https://developers.google.com/my-business/content/prereqs>
- GBP API sunset dates — <https://developers.google.com/my-business/content/sunset-dates>
- Places API (New) — Place Details — <https://developers.google.com/maps/documentation/places/web-service/place-details>
- Places API Review object schema — <https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places#Review>
- Prior audit (this repo) — `docs/reviews-source-audit.md`
- Sibling beads — cfw-tm9 (audit), cfw-49h (impl), cfw-0ty (PDP CTA, unrelated)
