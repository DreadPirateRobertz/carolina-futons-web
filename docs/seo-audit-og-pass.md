# cf-ceex — per-page OG sweep (13 pages)

Follow-up from cf-5rmn SEO audit (miquella, 2026-05-10). Adds distinct
`openGraph` blocks to every page on the audit's "generic/missing OG" list.

| # | Page | Before | After |
|---|------|--------|-------|
| 1 | `/about` | title + description + canonical, no `openGraph` | + `openGraph` with `ABOUT_HERO_PHOTO` (hardwood platform bed in a calm bedroom — `ShopTheRoom` interior) as `og:image` |
| 2 | `/visit` | title + description + canonical, no `openGraph` | + `openGraph` with `DEFAULT_OG_IMAGE` |
| 3 | `/getting-it-home` | title + description + canonical, no `openGraph` | + `openGraph` with `DEFAULT_OG_IMAGE` |
| 4 | `/design-a-room` | title + description, no canonical, no `openGraph` | + `alternates.canonical` + `openGraph` with `DEFAULT_OG_IMAGE` |
| 5 | `/reviews` | title + description + canonical, no `openGraph` | + `openGraph` with `DEFAULT_OG_IMAGE` |
| 6 | `/guides` (listing) | title + description + canonical, no `openGraph` | + `openGraph` with `DEFAULT_OG_IMAGE` |
| 7 | `/guides/[slug]` | dynamic title + description only | + `alternates.canonical` + `openGraph` (`type: "article"`) per guide |
| 8 | `/gift-cards` | already has `openGraph` with `DEFAULT_OG_IMAGE` | unchanged (description already distinct) |
| 9 | `/spring-sale` | had `openGraph` but no `images` field and no canonical | + `images: [DEFAULT_OG_IMAGE]` + `alternates.canonical` (flagged by 5-agent review — bead acceptance required key pages to ship an `og:image`) |
| 10 | `/compare` | dynamic title only; populated case had `robots: noindex` | + distinct description + `openGraph` for both empty and populated branches (populated keeps `noindex`) |
| 11 | `/privacy` | already has `openGraph` (distinct description) | unchanged |
| 12 | `/terms` | already has `openGraph` (distinct description) | unchanged |
| 13 | private `/(member)/dashboard/orders` (`/account/orders` per audit) | inherits `robots: { index: false, follow: false }` from `(member)/layout.tsx` | unchanged — parent layout already noindexes the entire `(member)` route group, so no page-level guard required |

## Distinctness check

`tests/og-metadata.test.ts` now asserts every public page in the sweep
has a unique `openGraph.description` (Set-size === array-length).

## Image strategy

The audit only requires "key pages have og:image". The strategy here:

- `/about` — gets the porch / Blue Ridge hero (`ABOUT_HERO_PHOTO`) because
  that's the strongest brand asset for a generic share preview.
- Every other page in the sweep — uses `DEFAULT_OG_IMAGE` (the Monterey
  hardwood frame scene from `src/lib/og.ts`) until a page-specific
  Wix CDN image is sourced. The default still beats a missing/blank
  preview card and matches what the rest of the codebase does.

Future improvement (separate bead): source page-specific Wix CDN images
for `/visit` (showroom interior), `/getting-it-home` (delivery truck),
`/design-a-room` (room planner mockup), `/reviews` (review carousel),
and `/guides/[slug]` (per-guide hero illustration). The current sweep
prioritizes structural coverage; image artistry is a separate pass.

## Twitter card wiring

Each modified page now also routes its `openGraph` through
`twitterFromOpenGraph()` (`src/lib/seo/twitter-from-og.ts`) so non-OG
Twitter/X crawlers get the same title/description/images. This matches
the baseline cf-og-meta pattern on shop/PLP/PDP pages and closes the
cf-5rmn audit §P2 #3 finding that prompted creation of the helper.
The 5-agent review on this PR caught the missing wiring during the
first pass; folded in the same commit window.

## Acceptance checks

- [x] All 13 audit-listed pages have distinct `og:description`
- [x] Key pages have `og:image` (every public sweep page, including the
      newly-fixed `/spring-sale`; private orders inherits noindex)
- [x] Every modified page has matching Twitter card metadata
- [x] Single batched PR per cf-ukc6 (no WIP pushes, one push per PR)
- [x] Tests pin the contract — 13 new `cf-ceex per-page OG sweep` tests
      in `src/__tests__/og-metadata.test.ts` (incl. dynamic `/compare`
      populated branch, `/guides/[slug]` notFound branch, HTTPS-CDN URL
      check, twitter-mirror check, expanded distinctness check); 26
      existing cf-og-meta baseline tests still pass green
