# cfw — SEO Runtime Checks (post-credit-restore)

> **Bead**: cfw-chs (cf-5rmn follow-up) · **Date**: 2026-05-20 · **Checker**: opal · **Method**: runtime fetch of the live Vercel deployment (`carolina-futons-web.vercel.app`). No Vercel preview build was triggered — these are read-only fetches of the already-deployed app, so cf-ukc6 credit conservation is not affected.

This closes the four runtime checks the [2026-05-10 SEO audit](./seo-audit-2026-05-10.md) deferred under §"What this audit could NOT verify". The static audit assumed the in-code JSON-LD reaches the rendered page; the runtime check found that **assumption does not hold for the PDP** — exactly the class of issue runtime verification exists to catch.

---

## Executive summary

| # | Check | Result |
|---|---|---|
| 1 | Google Rich Results / JSON-LD shapes | 🟧 **PDP Product + Breadcrumb JSON-LD absent from server-rendered HTML** |
| 2 | Search Console coverage report | ⬜ **Not executable by agent** — needs Google Search Console property access (human) |
| 3 | Lighthouse SEO score | 🟨 Lighthouse CLI not run (no Chrome in env); HTML-level SEO signals audited by hand — clean except for #1 and #4 |
| 4 | Canonical conflict check | 🟧 **No conflicts**, but `/blog/[slug]`, `/faq`, `/our-story` emit **no canonical at all** |

| Severity | Count | Action |
|---|---:|---|
| 🟥 P0 | 0 | none |
| 🟧 P1 | 1 | PDP structured data not in SSR HTML (check #1) — follow-up bead |
| 🟨 P2 | 2 | canonical gaps (check #4) + LocalBusiness/BlogPosting field enrichment — follow-up beads |
| ⬜ P3 | 2 | home canonical vs sitemap trailing-slash mismatch; missing `og:type` on some routes |

Pages sampled (one of each type the bead names): home `/`, PDP `/products/solstice-futon-frame`, PLP `/shop/futon-frames`, blog `/blog/futon-vs-sofa-bed-the-complete-comparison-for-2026`, `/faq`, `/visit`, `/our-story`.

---

## Check #1 — Rich Results / JSON-LD (runtime)

Extracted every `<script type="application/ld+json">` **from the server-rendered HTML** (not post-hydration DOM) and parsed it.

| Page | Server-rendered JSON-LD | Notes |
|---|---|---|
| home | `Organization` | ✅ via layout `jsonld-org` |
| PDP | `Organization` **only** | 🟧 `Product` + `BreadcrumbList` **missing from SSR HTML** |
| PLP | `Organization`, `BreadcrumbList` | ✅ |
| blog | `Organization`, `BlogPosting` | ✅ — missing recommended `image`, `dateModified` |
| FAQ | `Organization`, `FAQPage` | ✅ |
| visit | `Organization`, `LocalBusiness` | ✅ — missing recommended `geo`, `openingHoursSpecification`, `image` |
| our-story | `Organization` only | ✅ (no page-specific schema expected) |

### 🟧 P1 — PDP Product + Breadcrumb JSON-LD never reaches the server HTML

`src/app/products/[slug]/page.tsx:302-303` renders `<JsonLd id="jsonld-product">` and `<JsonLd id="jsonld-breadcrumb">`. In the **served HTML** neither tag exists — the only real `application/ld+json` script is `jsonld-org` from the layout.

Root cause: `/products/[slug]` has a `loading.tsx`, which wraps the route segment in `<Suspense>`. On the fetched response the document `<body>` is the **`pdp-loading` skeleton** (`<main data-slot="pdp-loading" aria-busy="true">`, with the React `<!--$?--><template id="B:0">` Suspense marker); the real page — including both `<JsonLd>` tags — is delivered only as escaped RSC flight data (`self.__next_f.push([...])`) and rendered client-side after hydration. `/shop/[category]` and `/blog/[slug]` also have `loading.tsx` but their page-specific JSON-LD *did* land in the SSR HTML, so the trigger is the PDP segment suspending past the shell flush (heavier catalog fetches) rather than `loading.tsx` alone.

Impact: Googlebot renders JS and would likely still index the markup, but the **Rich Results Test and most third-party SEO crawlers read the initial HTML** — against the PDP they see no `Product` schema, so price/availability rich results are unverifiable and fragile. The PDP is the single most rich-result-valuable page type on the site.

The `Offer` shape itself, once extracted from the flight payload, is **valid**: `price: "420.00"`, `priceCurrency: "USD"` (valid ISO 4217 — answers the audit's `priceCurrency` concern), `availability: "https://schema.org/InStock"`.

**Recommended follow-up bead (P1)**: guarantee `Product` + `BreadcrumbList` JSON-LD are in the PDP server HTML — e.g. hoist the `<JsonLd>` tags into a non-suspending part of the tree (the layout/segment boundary or `generateMetadata`'s `other` channel), or prerender the PDP fully via SSG so no streaming occurs.

---

## Check #2 — Search Console coverage report

**Not executable by an automated agent.** The Search Console coverage report requires authenticated access to the verified `carolinafutons.com` property (Google account ownership / OAuth). This must be run by a human with Search Console access.

What to verify when run:
- Indexed-page count vs `sitemap.xml` (128 URLs) + `near-cities-sitemap.xml`.
- No unexpected "Crawled — currently not indexed" / "Discovered — not indexed" on shoppable pages.
- After check #1 ships: confirm PDP `Product` rich results are *Valid* (not *Valid with warnings*) in the Shopping/Merchant report.

---

## Check #3 — Lighthouse SEO

Lighthouse CLI was not run — no Chrome/`lighthouse` binary in this environment. The HTML-level signals Lighthouse's SEO category scores were audited directly instead:

| Signal | Result |
|---|---|
| `<title>` present, unique, descriptive | ✅ all 7 pages distinct |
| `<meta name="description">` present | ✅ all 7 pages |
| `<html lang="en">` | ✅ all 7 pages |
| `<meta name="viewport">` | ✅ all 7 pages |
| `robots` meta | ✅ none set → default `index,follow` (correct for these routes) |
| `hreflang` | n/a — single-locale site |
| HTTP status | ✅ 200 on all sampled pages |
| Structured data valid | 🟧 see check #1 (PDP) |

To run the full Lighthouse SEO category (CI or a human):

```bash
npx lighthouse https://carolina-futons-web.vercel.app/products/solstice-futon-frame \
  --only-categories=seo --output=json --chrome-flags="--headless"
```

No title collisions were found (the audit flagged this as a risk). Note: each page's DOM also contains an SVG `<title>` ("Blue Ridge mountain skyline…") inside the LivingHero illustration — that is the SVG's accessible name, not a second document title, and is not a collision.

---

## Check #4 — Canonical conflict check (runtime DOM)

Counted `<link rel="canonical">` tags per page in the served HTML.

| Page | canonical tags | href |
|---|---:|---|
| home | 1 | `https://www.carolinafutons.com` |
| PDP | 1 | `https://www.carolinafutons.com/products/solstice-futon-frame` |
| PLP | 1 | `https://www.carolinafutons.com/shop/futon-frames` |
| visit | 1 | `https://www.carolinafutons.com/visit` |
| blog | **0** | — |
| FAQ | **0** | — |
| our-story | **0** | — |

**No conflicts** — no page emits two canonical tags, and no metadata-level/`<link>`-level disagreement was found. The audit's worry about a runtime-only conflict did not materialize.

But three page types emit **no canonical at all**. Confirmed in code:
- `src/app/blog/[slug]/page.tsx` — computes `canonicalUrl` and uses it for `openGraph.url` + the BlogPosting schema, but never sets `metadata.alternates.canonical`.
- `src/app/faq/page.tsx` — static `metadata` with no `alternates`.
- `src/app/our-story/page.tsx` — no canonical in metadata.

The cf-5rmn P1 fixes (cfw-66k PDP, cfw-clz PLP) covered only PDP + PLP; blog/faq/our-story were never given `alternates.canonical`.

**Recommended follow-up bead (P2)**: add `alternates: { canonical }` to `/blog/[slug]`, `/faq`, `/our-story`, and sweep remaining indexable routes for parity.

### ⬜ P3 — observations

- **Trailing-slash mismatch**: home canonical is `https://www.carolinafutons.com` (no trailing slash) but `sitemap.xml` lists `https://www.carolinafutons.com/` (with slash). Google treats these as the same URL but normalizing avoids a self-referential-canonical warning. Pick one form.
- **`og:type`**: blog (`article`) and our-story (`website`) set `og:type`; home/PDP/PLP/FAQ/visit do not. Low impact, but PDP ideally carries product-oriented OG tags.

---

## Recommended follow-up beads

| Priority | Title |
|---|---|
| P1 | PDP — ensure `Product` + `BreadcrumbList` JSON-LD reach the server-rendered HTML (not trapped behind the `loading.tsx` Suspense stream) |
| P2 | Add `alternates.canonical` to `/blog/[slug]`, `/faq`, `/our-story`; sweep remaining routes |
| P2 | Enrich `LocalBusiness` (`geo`, `openingHoursSpecification`, `image`) and `BlogPosting` (`image`, `dateModified`) |
| — | Check #2 (Search Console coverage) — assign to a human with Search Console access |

## Refs

- `docs/qa/seo-audit-2026-05-10.md` §"What this audit could NOT verify"
- cf-ukc6 (Vercel-credit conservation standing order)
- Sibling: cfw-mny (a11y runtime pass) — same post-credit-restore gating
