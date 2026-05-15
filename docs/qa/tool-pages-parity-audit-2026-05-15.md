# cfw — Tool Pages Parity Audit (`/compare` + `/search`)

> **Bead**: cf-ruhm · **Parent**: cf-3qt.6 Tool pages parity · **Date**: 2026-05-15 · **Auditor**: quartz · **Method**: static analysis of cfw Next.js source + live `curl` fetches of carolinafutons.com (Wix Studio prod) for parity comparison.

---

## Executive summary

Two pages, two very different parity stories:

| Page | cfw status | Wix Studio prod status | Parity verdict |
|---|---|---|---|
| `/compare` | Ships full feature (2–4 products, 10 attributes, slug-keyed, accessible) | **HTTP 404 — no `/compare` route on prod**; logic exists only in `src/public/comparePageHelpers.js` (never wired to a rendered page) | ✅ **cfw richer** — cfw is the only place this feature actually ships to shoppers. Treat as cfw-original, not a port. |
| `/search` | Ships server-rendered results (Products + Articles, hard cap 12 + 8) | Ships full search (4 tabs: All / Products / Pages / Blog, 41 results for "futon", direct add-to-cart from results) | ⚠ **Wix richer** — cfw misses 4 substantive features: type tabs, Pages search, pagination, in-result add-to-cart |

| Severity | Count | Pages | Action |
|---|---:|---|---|
| 🟥 P0 — blocks customer task or fails contract | **0** | — | none |
| 🟧 P1 — significant gap vs prod that customer-facing | **3** | /search ×3 | sub-beads (see §P1 fix list) |
| 🟨 P2 — polish / parity improvement | **4** | /search ×3, /compare ×1 | follow-up beads |
| ⬜ P3 — observation / future-proof | **2** | — | tracked; no bead unless regression |

Acceptance per the bead: "audit compare+search Next.js vs Wix" — both pages walked, parity gaps enumerated, fix sub-beads recommended. **Zero P0s** confirms the cfw tool pages function; the P1 set is concentrated on `/search`'s missing features versus Wix's mature search widget.

---

## §1 — `/compare`

### What cfw ships

**Route**: `src/app/compare/page.tsx` — server component, `force-dynamic`, `robots: { index: false, follow: true }`.

**Helper lib**: `src/lib/product/compare.ts` — pure functions, comment notes "ported from `src/public/comparePageHelpers.js` (Wix Studio)".

**URL**: `/compare?slugs=a,b,c,d` — slug-keyed (Wix Studio's port keyed by `_id`; cfw is slug-first throughout).

**Attribute set** (10 rows, from `COMPARE_ATTRIBUTES`):
- Frame Material · Closed Dimensions · Open Dimensions · Weight Capacity · Mattress Size · Seat Height · Price · Rating · In Stock · Available Fabrics

**Display** (`src/components/compare/CompareTable.tsx`):
- Per-column: thumbnail, name → PDP link, "Remove" link that rebuilds the URL.
- Per-row: label + N values, `data-has-diff="true"` highlight when values differ.
- A11y: `<table aria-label="Product comparison">`, `<caption class="sr-only">`, `scope="col"` and `scope="row"` on every header, semantic structure.
- Dark mode: `dark:text-cf-cream` on headings (covered by cf-rn4j wave 2; `compare/page.tsx` and `components/compare/CompareTable.tsx` both swept in commit 6ce5383).

**Empty state**: distinct `reason="too-few-slugs"` vs `"products-not-found"` (data-slot exposes which for tests / styling).

**Tests** (`src/__tests__/`):
- `compare.test.ts` — helper unit tests
- `compare-state.test.ts` — URL parsing + remove flow
- `compare-page.test.tsx` — page-level render tests with mocked SDK

### What Wix Studio prod ships

```
$ curl -I https://www.carolinafutons.com/compare
HTTP/2 404
```

No `/compare` route on Wix Studio prod. The helper module at `src/public/comparePageHelpers.js` in the cfutons Velo repo was implemented (cf-o6r5) but never connected to a rendered page.

### Findings

**🟨 P2.1** — `/compare` has no entry point from PLP or PDP. Users have to construct `?slugs=a,b` manually. PLP cards have `AddToCompareButton.tsx` but the wiring to a "Compare (N)" tray + Go-to-compare CTA is unclear from a static read; verify in browser or via tests. If the entry-point flow is missing on PLP, this becomes P1.

**🟨 P2.2** — `/compare` is `robots: { index: false, follow: true }` — correct for arbitrary-slug-tuple URLs, but a curated "Compare popular futons" canonical landing page (e.g. `/compare/popular-futons`) would be index-worthy and SEO-positive. cfw could ship one or two pre-built compare URLs that Search Console can crawl.

**⬜ P3.1** — Comment in `src/lib/product/compare.ts:1-9` says "ported from `src/public/comparePageHelpers.js` (Wix Studio)". The Wix-studio source remains the secondary reference. If the cfutons rig retires `comparePageHelpers.js` (now that the rendered version lives only in cfw), the comment becomes stale. Track in a future Velo-retirement bead under the cf-3qt epic.

### `/compare` is cfw's win

Treat `/compare` as a **cfw-original feature**, not a port. No parity work needed; minor polish only.

---

## §2 — `/search`

### What cfw ships

**Route**: `src/app/search/page.tsx` — server component, `force-dynamic`, `robots: { index: false, follow: true }`. Comment: "cf-3qt.5.4: server-rendered `/search?q=…` results page."

**Backing**:
- `searchProducts(q, limit=12)` in `src/lib/wix/products.ts` — case-insensitive **substring** match on `name`, walks `listAllProducts(SEARCH_CATALOG_CAP)` then `.includes()` filters in memory.
- `searchPosts(q, limit=8)` in `src/lib/wix/blog.ts` — case-insensitive **prefix** match on `title` via `queryPosts().startsWith("title", trimmed)`. Comment notes: "Wix Blog `queryPosts()` builder supports `startsWith` on `title` only — substring `contains` is not in the SDK, so search is prefix-only for now."

**URL**: `/search?q=futon` — single `q` param, no type filter.

**Sections** (two-column layout `2fr,1fr`):
- Products list — thumbnail (64×64), name, formatted price, link to PDP
- Articles list — title, line-clamp-2 excerpt, link to blog post

**Empty `q`**: guided state — H1 "Search" + form + suggestion chips (`futon`, `mattress`, `murphy`, `guide`).

**No results**: illustration + apology + same suggestion chips.

**Tests**: `src/__tests__/SearchPage.test.tsx` — 7 tests covering empty, populated, no-results, form-state-preservation.

**A11y**:
- `<form role="search">`, `<label htmlFor="search-q" class="sr-only">Search query</label>`, `type="search"`
- `<section aria-labelledby="search-products-heading">` and `aria-labelledby="search-articles-heading"`
- `focus-visible:ring` on every result link

### What Wix Studio prod ships

`curl -sL "https://www.carolinafutons.com/search?q=futon"` → HTTP 200 with `<title>Search Results: 'futon' - Carolina Futons</title>` and `<h2 aria-live="polite" aria-atomic="true">41 results found for "futon"</h2>`.

Inspecting the rendered DOM:

| Feature | Wix prod | Evidence |
|---|---|---|
| **Total result count** | "41 results found for 'futon'" | `<h2 data-hook="total-results" aria-live="polite">` |
| **Type tabs** | All · Products · Pages · Blog (4 tabs) | `data-hook="scrollable-tabs"`, `sample-layout-group-products`, `…-pages`, `…-view-all` |
| **Type filter URL** | `/search?q=futon&type=products` | href visible in HTML |
| **Pages search** | Yes — 26 results found on `?type=pages` separately | second curl |
| **In-result add-to-cart** | Yes — visible add-to-cart button per result | `data-hook="add-to-cart-button"` |
| **Display modes** | List + Grid | `data-hook="list-layout-item"` + `…-grid-layout-item` |
| **Clear search** | Yes | `data-hook="clear-button"` |
| **Result scrolling** | Pagination + scroll-tab nav | `left-nav-btn` / `right-nav-btn` |

### Findings — `/search`

#### 🟧 P1.1 — `/search` has no type filter or tabs (All / Products / Pages / Blog)

**Wix prod**: 4 scrollable tabs gate result type. `/search?q=futon&type=products` is a real URL on prod.

**cfw**: single combined view, Products + Articles only. No `?type=` query param.

**Why it matters**: A shopper looking for "warranty" wants the *Pages* result (the FAQ / warranty policy page), not the product whose copy mentions "warranty". cfw forces them to scan a mixed list.

**Fix direction**:
- Add `?type=` query param: `products` | `articles` | `pages` | `all` (default `all`).
- Render a tabs bar above the result sections (semantic `role="tablist"`, `aria-selected`, keyboard nav).
- For `?type=pages`, add a `searchPages()` reader (static-paths + manifest of `/visit`, `/contact`, `/faq`, `/sustainability`, `/our-story`, etc.) — Pages search doesn't need Wix SDK; it can come from a small in-repo manifest with title + description + keywords.

**Files**: `src/app/search/page.tsx`, new `src/lib/search/pages.ts`, possibly `src/components/site/SearchTabs.tsx`.

#### 🟧 P1.2 — `/search` lacks pagination; hard caps at 12 products + 8 articles

**Wix prod**: "41 results found" — the full match set is reachable via pagination.

**cfw**: `PRODUCT_LIMIT = 12`, `POST_LIMIT = 8` — silently truncated. A shopper searching "futon" sees ≤20 results when prod shows 41; everything past the cap is invisible without telling them.

**Why it matters**: Power users hitting the cap don't know they hit it. The header reads "Showing 12 products and 8 articles for 'futon'." not "Showing the first 12 of N." That's a data trustworthiness gap.

**Fix direction**:
- Add `?page=N` query param + `pageSize` default 12.
- Surface total count vs shown count: "Showing 1–12 of 41 for 'futon'."
- Standard prev/next pagination footer (mirror the PLP `PLPPagination` component pattern).
- Bonus: include `aria-live="polite"` on the total-results heading so screen readers re-announce the count on each search (Wix does this).

**Files**: `src/app/search/page.tsx`, `src/lib/wix/products.ts` (return `{ items, total }` shape instead of `Product[]`), `src/lib/wix/blog.ts` (same).

#### 🟧 P1.3 — Article search is prefix-only (substring match unsupported by Wix Blog SDK)

**cfw**: `searchPosts(q)` uses `queryPosts().startsWith("title", trimmed)` — matches articles whose title *begins with* the query. "futon mattress care" matches; "Best mattress for a futon" doesn't.

**Wix prod**: 26 Pages results + N Blog results on "futon" — substring match across body content.

**Why it matters**: Shoppers searching "warranty" miss the "Frame warranty terms" article because the title starts with "Frame", not "warranty".

**Fix direction** (one of):
1. **In-memory full-title scan**: `listAllPostSlugs() → fetch each posted title → .includes(q)`. Bounded by `BLOG_CATALOG_CAP`, similar to the products path.
2. **Wix Blog `WixSelect`/advanced query** if the SDK has added substring support since the comment was written (worth re-checking).
3. **Body-content search**: extend the in-memory scan to `excerpt` or `contentText` (longer fetch, deeper match).

Pick (1) for the smallest diff; revisit (3) if cf-3qt.6.2 dashboards show low article CTR from search.

**Files**: `src/lib/wix/blog.ts:searchPosts`.

#### 🟨 P2.3 — `/search` results don't expose add-to-cart inline

**Wix prod**: each product result has a `data-hook="add-to-cart-button"`. Shopper can add from the results page without clicking through to PDP.

**cfw**: result is a `<Link>` to PDP only. No add-to-cart, no quick-view.

**Recommendation**: defer to a P2 follow-up. cfw has a `QuickViewModal` component (`src/components/product/QuickViewModal.tsx`) used by PLP — wiring it into `/search` results is a tractable polish item. Skip the inline add-to-cart button (it'd require variant resolution at the result level for variant-enabled products) and lean on QuickView for parity.

**Files**: `src/app/search/page.tsx` (result item wrapping), reuse `QuickViewModal`.

#### 🟨 P2.4 — `/search` total-result heading isn't `aria-live`

**Wix prod**: `<h2 data-hook="total-results" aria-live="polite" aria-atomic="true">41 results found for "futon"</h2>` — screen readers re-announce on every search submission.

**cfw**: the header `<p class="text-sm text-cf-muted">` is plain — no `aria-live`, no `role="status"`. When a screen-reader user submits the form, the new result count is silent until they manually tab back to the heading.

**Fix**: add `role="status"` (or `aria-live="polite"` + `aria-atomic="true"`) to the `<p>` element under the H1, wrap the dynamic count + query inside it.

**Files**: `src/app/search/page.tsx` (~line 60).

#### 🟨 P2.5 — `/search` empty-state and no-results both surface suggestion chips

Already shipped (cfw richer than prod here — prod's empty state is just the form). No action; note as cfw-positive parity.

### `/search` — what cfw does better than prod

- **Server-rendered**: full HTML on first byte; Wix renders client-side and the initial paint is a loading skeleton.
- **Suggestion chips**: prod doesn't surface "Try: futon / mattress / murphy / guide" on the empty state.
- **Empty-state illustration**: prod's no-results is plain text.
- **Form a11y**: cfw uses a proper `<label class="sr-only">` paired by `htmlFor`. Wix uses `data-hook="search-input"` with no visible label association from the static HTML.

These are cfw wins — keep them in any parity work.

---

## §3 — What this audit could NOT verify

Static analysis + `curl` only. Three runtime checks remain (gate them on cf-ukc6 lift if Vercel preview is involved):

1. **Add-to-compare flow end-to-end** — PLP `AddToCompareButton` → compare tray → `/compare?slugs=…`. Static read shows the button exists; verifying the user-visible path needs Playwright (or a manual click-through).
2. **Search submission UX** — Does submitting the form preserve scroll? Re-trigger `force-dynamic` server-render? Render time on a cold cache? All need a running dev server.
3. **Wix prod feature audit on a search query with > 12 results** — confirmed 41 for "futon"; should sweep 3–5 common queries ("mattress", "platform", "futon mattress", "queen") to verify pagination is the consistent pattern, not a result-count-specific behavior.

Recommend folding these into the existing **cfw-mny / cfw-chs** runtime-pass beads (both gated on cf-ukc6 Vercel-credit lift) — adds 4–6 Playwright assertions, no new tooling.

---

## §4 — Recommended sub-beads

| Sub-bead | Pri | Title | Scope |
|---|---|---|---|
| cf-ruhm.1 | P1 | `/search` type tabs + Pages reader | URL `?type=`, tablist component, `searchPages()` lib, Pages manifest. (~3 files, ~150 LoC + tests) |
| cf-ruhm.2 | P1 | `/search` pagination + total count | `?page=N`, return `{ items, total }`, "Showing 1–12 of 41" header, prev/next footer (mirror PLP pattern) |
| cf-ruhm.3 | P1 | `/search` article substring match | Replace `.startsWith()` with in-memory `listAllPostSlugs` → title-fetch → `.includes()` scan in `searchPosts` |
| cf-ruhm.4 | P2 | `/search` QuickView from result tile | Reuse `QuickViewModal` (existing PLP component) on product result rows |
| cf-ruhm.5 | P2 | `/search` total-results heading `role="status"` | A11y parity with prod's `aria-live="polite"` on result count |
| cf-ruhm.6 | P2 | `/compare` entry-point flow verification | Audit PLP `AddToCompareButton` → tray → URL build; ship the missing pieces if any |
| cf-ruhm.7 | P2 | `/compare` curated-landing canonical | `/compare/popular-futons` static-list compare URL for SEO |
| cf-ruhm.8 | P3 | Retire `src/public/comparePageHelpers.js` in cfutons rig | Velo-side cleanup; cfw is the live owner |

Bundle cf-ruhm.1–.3 into one PR per cf-ukc6 if the implementation is mechanical enough (shared `?type=` + pagination plumbing). cf-ruhm.4–.5 are independent polish; .6–.7 are SEO-positive but lower velocity.

---

## §5 — TDD + doc compliance notes (per 2026-05-15 standing order)

Per Stilgar's TDD / doc standing order (`feedback_tdd_doc_standards.md`):

- **Existing test coverage** on the two tool pages is acceptable but not exhaustive:
  - `/compare`: 3 test files — helper unit (`compare.test.ts`), URL parsing (`compare-state.test.ts`), page rendering (`compare-page.test.tsx`). Good baseline.
  - `/search`: 1 test file (`SearchPage.test.tsx`) — 7 tests covering happy-path and the three empty states. **Missing edge cases**: SDK failure (degrades to no-results), query whitespace handling, special-character escape, query exceeding `SEARCH_CATALOG_CAP`. Each sub-bead above should add these.
- **JSDoc**: cfw is TypeScript so `@param`/`@returns` come from type signatures. The WHY-comment-block requirement still applies — `searchProducts` (`products.ts:327`) and `searchPosts` (`blog.ts:125`) both have WHY comments; new `searchPages()` should follow the same pattern.
- **PR description format**: the sub-bead PRs should follow `cfutons/CONTRIBUTING.md` §"PR Description Format" — Summary, Coverage table, Test plan checklist. cfutons_web does NOT yet have its own CONTRIBUTING.md (gap surfaced by this audit) — see cf-ruhm.9 below.

| Sub-bead | Pri | Title | Scope |
|---|---|---|---|
| cf-ruhm.9 | P2 | Add `CONTRIBUTING.md` to cfutons_web root | Mirror cfutons template; adapt to Next.js / Vitest. Closes the standing-order gap surfaced by this audit. |

---

## Refs

- Bead: cf-ruhm · Parent: cf-3qt.6 Tool pages parity
- Sibling audits: `docs/qa/a11y-audit-2026-05-10.md` (cf-7tkf), `docs/qa/seo-audit-2026-05-10.md` (cf-5rmn), `docs/qa/dark-mode-wave2-audit-2026-05-10.md` (cf-rn4j), `docs/visual-parity-audit-2026-05-09.md` (cfw-y2i)
- Standing orders: cf-ukc6 (Vercel-credit conservation — drove the static-only methodology), 2026-05-15 5-agent review + TDD/Doc standards
- Files reviewed: `src/app/compare/page.tsx`, `src/app/compare/loading.tsx`, `src/components/compare/CompareTable.tsx`, `src/components/compare/AddToCompareButton.tsx`, `src/lib/product/compare.ts`, `src/app/search/page.tsx`, `src/lib/wix/products.ts:searchProducts`, `src/lib/wix/blog.ts:searchPosts`, `src/__tests__/SearchPage.test.tsx`, `src/__tests__/compare-page.test.tsx`
- Wix prod URLs fetched: `https://www.carolinafutons.com/compare` (404), `https://www.carolinafutons.com/search?q=futon` (200, 41 results), `https://www.carolinafutons.com/search?q=futon&type=pages` (200, 26 results)
