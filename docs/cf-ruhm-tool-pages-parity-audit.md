# cf-ruhm — Tool pages parity audit (cfw vs Wix Studio prod)

**Bead:** cf-ruhm (cf-3qt.6 — Phase 6 parallel-run audit)
**Author:** godfrey (cfutons/crew)
**Captured:** 2026-05-15 (code-side audit; visual diff deferred per Vercel freeze 2026-05-15..05-17)
**Surface:** `/compare` and `/search` on cfw vs the corresponding Wix Studio surfaces on `www.carolinafutons.com`
**Sibling:** [cf-yeg2 PLP parity audit](cf-yeg2-plp-parity-audit.md) — same audit shape, same freeze caveat.

> **TL;DR.** Both tool pages on cfw have **no Wix Studio counterpart**. Wix Stores does not expose a side-by-side compare UI, and Wix's only "search" is the universal site-search overlay (small input box that pops a filtered product list, no per-blog-post search). cfw `/compare` and `/search` are net-new functionality vs prod, not feature regressions. Parity is **N/A — cfw additions**; cutover is purely beneficial.

## Pages audited

| cfw URL | Wix prod URL | Status |
|---|---|---|
| `/compare?slugs=…` | (none) | cfw-only addition |
| `/search?q=…` | Wix site-search overlay (no canonical URL) | cfw-only canonical URL; surface partially overlaps the Wix overlay |

---

## §1 — `/compare`

### cfw surface
- Server component (`dynamic = "force-dynamic"`).
- Query-string driven: `?slugs=monterey-futon,charleston-platform-bed`.
- `parseCompareSlugs()` enforces `COMPARE_MIN = 2`, `COMPARE_MAX = 4` (cap at 4 products).
- Empty / under-min: `<CompareEmptyState reason="too-few-slugs">`. Distinct copy.
- All-bad-slugs: `<CompareEmptyState reason="products-not-found">`. Distinct copy.
- 2-4 valid products: `<CompareTable products={…}>` rendering 10 attribute rows (`COMPARE_ATTRIBUTES`):
  - Frame Material, Closed Dimensions, Open Dimensions, Weight Capacity, Mattress Size, Seat Height, Price, Rating, In Stock, Available Fabrics
- `isDiff(values)` flags rows where products differ — highlighted in the table.
- `buildRemoveSlugUrl()` per product column (one-click remove).
- `buildCompareTitle(products)` produces the dynamic `<title>` (e.g. "Monterey vs Charleston — Carolina Futons").
- Robots: `index: false, follow: true` on the populated branch (no infinite ad-hoc comparison-permutation indexing).
- openGraph + Twitter card on both empty and populated branches (cf-ceex fold).

### Wix prod surface
- **Does not exist.** Wix Stores has no native compare page. Some Wix Studio templates author a custom "compare" widget per product card (modal-based, max 2-3 products) but Carolina Futons' Studio template does not surface one.

### Verdict
✅ **cfw addition** — no parity gap to close. Acceptance-passing on the structural side.

### One carry-forward
Confirm with Brenda that the compare flow is something marketing wants surfaced (it's reachable from the "Add to Compare" button on PLP / PDP cards). If marketing prefers to defer, gate the AddToCompare button behind a feature flag at cutover rather than yanking the page (since the page itself is harmless when nothing links to it).

---

## §2 — `/search`

### cfw surface
- Server component (`dynamic = "force-dynamic"`).
- Single query param: `?q=<term>`.
- Empty / missing `q`: guided-empty state (heading + `<SearchSuggestions>` panel + form).
- Non-empty `q`: parallel `searchProducts(q, 12)` + `searchPosts(q, 8)` calls.
  - `searchProducts` searches Wix Stores by product name.
  - `searchPosts` searches Wix Blog by post title.
  - Both helpers catch + log on SDK failure and degrade to "no matches" rather than 500.
- Result page: two-column grid on lg+ (`[2fr,1fr]`) — products left, articles right.
- `<NoResults q={q}>` empty-search state with suggestions to refine.
- Robots: `index: false, follow: true` (already in main; cfw doesn't want SERPs serving ad-hoc search URLs).
- openGraph: layout-level fallback; per-`q` OG would over-customize and burn CMS lookups on every share, intentionally omitted.

### Wix prod surface
- **No canonical `/search` URL.** Wix Studio surfaces a universal search through a top-bar magnifying-glass icon → opens an overlay → filters the products grid in place.
- Limited to products only. **No blog/article surface.**
- No shareable URL — overlay state is client-only.
- No empty-state guidance / suggestions panel.

### Verdict
✅ **cfw addition + parity-or-richer** on the overlapping product-search surface:
- cfw has a shareable URL (`/search?q=futon`) — Wix overlay does not.
- cfw also searches the Journal — Wix overlay does not.
- cfw renders server-side (LCP wins over the Wix client-side filter).
- cfw degrades gracefully on Wix SDK failure — Wix overlay shows an empty grid on the same failure.

### One carry-forward
The Wix overlay's "magnifying-glass icon in the header" is a UX affordance that's separate from this URL — if Brenda's header includes that icon, cfw's header (per cf-3qt.4 chrome) should expose an equivalent entry point (either an inline form or an icon that routes to `/search`). Likely already done by the Search affordance in the cfw header chrome, but worth confirming during cf-3qt.8.dress.

---

## Visual diff deferred

A Playwright screenshot diff of `/compare` populated (2-product, 4-product) + `/search?q=futon` is deferred to the next capture window:
- Vercel build credits frozen 2026-05-15..05-17 per cf-ukc6 (melania).
- Neither surface had a regression-class change since the cfw-y2i 2026-05-09 audit; cf-ceex's openGraph fold (2026-05-15) only adds metadata, not visual surface.
- Re-capture at cutover dress-rehearsal (cf-3qt.8.dress) is sufficient.

---

## Acceptance (cf-3qt.6 audit)

- [x] Functional matrix complete for `/compare` and `/search`
- [x] No critical functional regressions vs Wix prod (both are cfw additions, no regression possible)
- [x] cfw matches or exceeds Wix on every overlapping axis (search surface)
- [x] No Wix counterpart to enumerate for `/compare`
- [ ] Visual screenshot diff — deferred per Vercel freeze, scheduled for cf-3qt.8.dress

## Recommendation

**No critical gaps.** cf-ruhm passes the cf-3qt.6 audit gate on the structural side. Both tool pages are cutover-additive, not regressions. Move to sibling parity beads (cf-lc1c PDP, cf-7pk0 static, cf-vmll content, cf-yu2l promo, cf-4i44 policy, cf-d41j member, cf-wsrr cart).

Refs cf-ruhm (this bead), cf-3qt.6 (parent), cf-3qt.5.4 (search page baseline), cf-ceex (OG sweep fold for /compare empty + populated).
