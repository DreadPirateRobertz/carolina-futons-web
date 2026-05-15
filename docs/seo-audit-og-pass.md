# cf-ceex — per-page OG sweep (13 pages)

Follow-up from cf-5rmn SEO audit (miquella, 2026-05-10). Adds distinct
`openGraph` blocks to every page on the audit's "generic/missing OG" list.

| # | Page | Before | After |
|---|------|--------|-------|
| 1 | `/about` | title + description + canonical, no `openGraph` | + `openGraph` with `ABOUT_HERO_PHOTO` (porch / Blue Ridge scene) as `og:image` |
| 2 | `/visit` | title + description + canonical, no `openGraph` | + `openGraph` with `DEFAULT_OG_IMAGE` |
| 3 | `/getting-it-home` | title + description + canonical, no `openGraph` | + `openGraph` with `DEFAULT_OG_IMAGE` |
| 4 | `/design-a-room` | title + description, no canonical, no `openGraph` | + `alternates.canonical` + `openGraph` with `DEFAULT_OG_IMAGE` |
| 5 | `/reviews` | title + description + canonical, no `openGraph` | + `openGraph` with `DEFAULT_OG_IMAGE` |
| 6 | `/guides` (listing) | title + description + canonical, no `openGraph` | + `openGraph` with `DEFAULT_OG_IMAGE` |
| 7 | `/guides/[slug]` | dynamic title + description only | + `alternates.canonical` + `openGraph` (`type: "article"`) per guide |
| 8 | `/gift-cards` | already has `openGraph` with `DEFAULT_OG_IMAGE` | unchanged (description already distinct) |
| 9 | `/spring-sale` | already has `openGraph` (distinct description) | unchanged |
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

## Acceptance checks

- [x] All 13 audit-listed pages have distinct `og:description`
- [x] Key pages have `og:image` (every public sweep page; private orders
      page inherits noindex)
- [x] Single batched PR per cf-ukc6 (no WIP pushes, one push per PR)
- [x] Tests pin the contract — 9 new `cf-ceex per-page OG sweep` tests in
      `src/__tests__/og-metadata.test.ts` plus the existing 26 from the
      cf-og-meta baseline pass green
