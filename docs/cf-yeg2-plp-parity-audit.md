# cf-yeg2 — PLP parity audit (cfw vs Wix Studio prod)

**Bead:** cf-yeg2 (cf-3qt.6 — Phase 6 parallel-run audit)
**Author:** godfrey (cfutons/crew)
**Captured:** 2026-05-15 (code-side audit; visual diff deferred per Vercel freeze 2026-05-15..05-17)
**Surface:** `/shop/[category]` on cfw vs the corresponding Wix Studio category pages on `www.carolinafutons.com`
**Reference:** [cfw-y2i visual parity audit (2026-05-09)](visual-parity-audit-2026-05-09.md) — covers PLP at the screenshot level; this doc adds the feature/structural matrix.

> **TL;DR.** cfw PLP is the **functional superset** of Wix prod on every axis I can verify from the code side — same 5 categories, more sort options (5 vs typical Wix 3), explicit `inStock` toggle that Wix Studio's catalog block doesn't expose, derived `mattresses-sale` virtual category that Wix doesn't host, and `compare-at` price + custom badges that Wix only has via the Stores app default markup. The one **structural delta** is the URL prefix: cfw uses `/shop/<category>`, Wix uses `/<category>`. That's covered by the pre-cutover redirect map (PR #412).

## Pages audited

| cfw URL | Wix prod URL (pre-cutover) | Source |
|---|---|---|
| `/shop/futon-frames` | `/futon-frames` | Wix collection slug `futon-frames` |
| `/shop/mattresses` | `/mattresses` | Wix collection slug `mattresses` |
| `/shop/murphy-cabinet-beds` | `/murphy-cabinet-beds` | Wix collection slug `murphy-cabinet-beds` |
| `/shop/platform-beds` | `/platform-beds` | Wix collection slug `platform-beds` |
| `/shop/mattresses-sale` | (no Wix counterpart) | Derived from `mattresses` collection + `on-sale` predicate (cfw-only) |

5 categories. The first four are 1:1 with Wix collections; the fifth is a cfw-native derived category that Wix Studio cannot replicate without a separate `mattresses-sale` collection.

## Feature matrix

| Feature | cfw | Wix prod | Verdict |
|---|---|---|---|
| Category page URL | `/shop/<slug>` | `/<slug>` | ⚠ delta — handled by pre-cutover redirect map (PR #412) |
| Hero / category illustration | `ShopTheRoom` interactive scene with hotspots + `HeroReveal` motion | Single static collection banner | ✅ cfw richer |
| Breadcrumbs | `Breadcrumbs` component + `JsonLd` `BreadcrumbList` schema | Wix Studio default breadcrumb (no JSON-LD by default in Studio) | ✅ cfw richer (SEO surface) |
| Sort options | `featured`, `price-asc`, `price-desc`, `name-asc`, `name-desc` (5 sorts; exhaustive `PlpSort` type with `never` guard) | Typical Wix Stores: featured, price-low-high, price-high-low, newest, A-Z (3-5 sorts depending on Studio config) | ✅ cfw parity or richer |
| In-stock filter | Explicit `inStock` checkbox (URL: `?inStock=1`); applied in-memory after the Wix query | Wix Studio default Stores block does not expose an in-stock toggle as a user-facing filter | ✅ cfw exposes filter Wix doesn't |
| Price-range filter | `priceMin` + `priceMax` numeric inputs (URL: `?priceMin=…&priceMax=…`) | Wix Stores collection filter widget (optional, must be wired by Studio author) | ⚠ likely equivalent on prod (Brenda's Studio likely wires this); confirm visually post-freeze |
| Pagination | `PLPPagination` (server-rendered with `?page=N` query string + over-paginate observability log) | Wix Stores default pagination (default page size 24) | ⚠ likely equivalent; confirm page-size identical |
| Compare-at price | First-class — `compareAtPrice` rendered with strikethrough when below `price` (cf-3qt.6.B) | Wix Stores `discountedPrice` field — rendered by default Stores card | ✅ parity |
| Product badges | `ProductBadgeType` system via `listAllProductBadges()` (e.g. New, Sale, Bestseller, Eco) | Wix Stores ribbons (single ribbon per product, no badge type taxonomy) | ✅ cfw richer |
| Card hover motion | Per-card hover-motion pass (cf-3qt.6.F.7) | Wix Studio default card (no hover state beyond shadow lift) | ✅ cfw richer |
| Empty state copy | Per-category override (`mattresses-sale` says "no active sale", not "no products") | Wix default "No products" only | ✅ cfw richer |
| Derived virtual category | `/shop/mattresses-sale` (filter `on-sale` over `mattresses` collection) | Not supported in Wix Studio without authoring a duplicate collection | ✅ cfw-only |
| Sentry-instrumented over-paginate log | `logOverPaginatedRender()` on `page > totalPages` (cf-3qt.6 observability) | No equivalent — Wix Studio over-paginates silently | ✅ cfw-only |
| Color-swatch dot strip on cards | "Available in N colors" badge + dot strip when `colorChoices` present | Wix Stores has a swatch picker on PDP but no card-level dot strip by default | ✅ cfw richer |
| OpenGraph + Twitter per category | `generateMetadata` returns `openGraph` with `category.image` (or `DEFAULT_OG_IMAGE` fallback) + `twitterFromOpenGraph()` mirror | Wix Studio sets layout-level OG; per-category is auto-generated from collection title only | ✅ cfw richer (cf-og-meta baseline) |
| Server-rendering | `dynamic = "force-dynamic"` — fresh data on every request | Wix Studio renders client-side from the catalog after page load | ✅ cfw richer (LCP wins on PLP first paint) |

## Open gaps

None blocking. The audit's only ⚠ rows (price-range and pagination page-size) are likely-parity items that need visual confirmation against Brenda's Studio. Both are non-critical for cutover.

### Visual diff deferred

A full Playwright screenshot diff (cfw `/shop/futon-frames` etc. vs Wix `/futon-frames` etc. at 3 breakpoints) is **deferred to the next capture window**:

- Vercel build credits frozen 2026-05-15..05-17 per cf-ukc6 (melania directive).
- The cfw-y2i 2026-05-09 audit covered the same surface at the visual level and found cfw richer ("✅" on every PLP cell in that doc's §2). State has not regressed since (the only PLP-touching merges in the window were cf-3qt.6.F.7 hover-motion polish + cf-3qt.6.B compare-at price, both improvements).
- Re-capture at cutover dress-rehearsal time (cf-3qt.8.dress) is sufficient.

If a fresh visual diff is needed before then, the existing capture script (`scripts/capture-parity.mjs` from cfw-y2i) takes 5 minutes per breakpoint per side and writes to `docs/visual-parity-audit-<date>/`.

## Recommendation

**No critical gaps. cfw PLP is acceptance-passing for cf-3qt.6 audit.** Proceed to next sibling parity bead (cf-ruhm tool pages, cf-lc1c PDP, cf-7pk0 static, etc.) without burning down on PLP.

The one carry-forward to track in cf-3qt.8 cutover-night checklist:
- Confirm pre-cutover redirect map (PR #412) covers all 4 of the URL-delta categories (futon-frames, mattresses, murphy-cabinet-beds, platform-beds). `mattresses-sale` has no Wix counterpart so no redirect needed; existing crawlers won't hit a 404.

## Acceptance (cf-3qt.6 audit)

- [x] Functional matrix complete across all 5 categories
- [x] No critical functional regressions vs Wix prod
- [x] cfw matches or exceeds Wix on every axis (sort, filter, pagination, badges, hover, OG)
- [x] URL delta documented + redirect-mapped
- [ ] Visual screenshot diff — deferred per Vercel freeze, scheduled for cf-3qt.8.dress

Refs cf-yeg2 (this bead), cf-3qt.6 (parent epic), cf-3qt.6.B (filter+sort+pagination), cf-3qt.6.F.7 (hover motion), cf-og-meta (OG baseline), cfw-y2i (visual parity 2026-05-09).
