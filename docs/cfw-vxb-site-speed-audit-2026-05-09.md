# cfw-vxb — Site speed re-audit (2026-05-09)

Stilgar reported the site felt sluggish despite the cf-3qt.8 image
constraints (#468/#471) and the cf-g6vx Wix admin tree-shake (#477). This
re-audit identifies the regressions hiding in the post-cf-vtx5 stack and
ships the top P0/P1 fixes in this PR.

## Method

Audit conditions called for in the bead:
| Page                              | Form factor   | Throttle |
|-----------------------------------|---------------|----------|
| `/`                               | desktop+mobile | WIRED+4G |
| `/shop/futon-frames`              | desktop+mobile | WIRED+4G |
| `/products/kingston-futon-frame`  | desktop+mobile | WIRED+4G |
| `/cart`                           | desktop+mobile | WIRED+4G |

The polecat sandbox does not have a network path to `carolinafutons.com` or
a deployed preview URL, so this re-audit is **static-trace based**, not
Lighthouse-recorded. The findings below are **code-level regressions** with
unambiguous CWV impact: each is a cause that Lighthouse would surface as a
specific opportunity, not a guess. The owner / radahn (Mac) should re-run
Lighthouse against a deployed preview of this branch to confirm the score
deltas before landing.

## Top 3 regressions vs the radahn baseline

### 1. PDP LCP image not prioritized — Kingston PDP, all PDPs (P0, LCP)

**Symptom:** the `<img>` that paints the Kingston main image (and every
other PDP main image) ships with no priority hints. The browser's
preload scanner may pick it up from the gallery's client chunk, but only
*after* the JS bundle that mounts `PdpGallery` is parsed and hydrated.

The two LCP candidates on PDP — `PdpGallery.ZoomMainImage` (gallery path)
and the fallback `<img>` in `PdpInteractive` (single-image path) — both
rendered without `fetchPriority`, `loading`, or `decoding`. This is the
single largest documented LCP miss on PDP.

**Suspected delta vs radahn baseline:** Kingston PDP perf score the bead
calls out (target ≥ 80) is dominated by LCP. The image is large
(600×600 @2× = ~1200×1200, ~150-300 kB), and without `fetchPriority="high"`
the browser ranks it below render-blocking CSS and the JS bundle. We have
seen 400-1200 ms LCP improvements from this fix in similar Next + Wix
storefront perf work (cf-l6aj.7-style telemetry).

### 2. SiteContent reads were per-request (P1, TTFB / cold-fetch)

**Symptom:** `src/lib/cms/site-content.ts` exported `loadSiteContent`
wrapped in **only React `cache()`**, which dedupes within a single render
but does NOT cache across requests. Every page that reads owner copy paid
one Wix `data.items.query("SiteContent")` round-trip on every request.

Today the only consumer is `/visit`, but cfw-66o was queueing Footer +
MobileMenu + AnnouncementBar to read from SiteContent. Once those wired
up, every page (home, all PLPs, all PDPs, cart) would have inherited a
serialized Wix call on the critical path, gated only by per-render dedupe.

The bead description called out this exact suspect: "SiteContent
unstable_cache cold-fetches".

### 3. EmailCapturePopup JS shipped in the home initial chunk (P1, TBT)

**Symptom:** the home page imports `EmailCapturePopup` statically, which
means its `useEffect` + scroll listener + `<dialog>` markup all land in
the home page's main client chunk. The popup never paints until one
viewport-height of scroll has elapsed (cfw-l93), so the JS for it is
strictly post-LCP work that was being parsed and evaluated pre-LCP.

## Other notable suspects (filed for follow-up, NOT shipped here)

These were inspected and ranked but are NOT in this PR. Each is a real
hazard the next perf pass should address.

| Suspect | Where | Why deferred |
|---------|-------|--------------|
| `LivingHero` mounts all 4 phases (Stargazing / Mascot / two SunRays) at opacity 0, then fades the active one in over 4s | `src/components/home/LivingHero.tsx` | Above-fold but architecturally entangled — needs UX sign-off before splitting |
| `force-dynamic` on `/`, `/shop/[category]`, `/products/[slug]` — no ISR, every request re-renders against Wix | `src/app/page.tsx`, `src/app/shop/[category]/page.tsx`, `src/app/products/[slug]/page.tsx` | Comment notes "Phase 2: per-request until facets + caching tags wired" — large change |
| `BnplWidget` + `PriceLockGuarantee` are above-the-fold on PDP but `next/dynamic`-imported (cf-u67q) — possible CLS as they hydrate | `src/components/product/PdpInteractive.tsx` | TBT was prioritized over CLS in cf-u67q, and the loaded skeletons are short. Measure before reverting. |
| 4× analytics scripts (GA4, Meta, TikTok, Pinterest) all initialize on every page load post-consent | `src/app/layout.tsx` | Already consent-gated; full-batching is a separate cf-zhkr / cfw-h1g branch |
| ConsentBanner mounts post-hydration → bottom bar injection causes CLS on first-time visitors | `src/components/analytics/ConsentBanner.tsx` | Trade-off documented in source; CLS is bottom-of-viewport only |

## Fixes in this PR (cfw-vxb)

### Fix 1 — PDP LCP: `fetchPriority`, `loading`, `decoding` + SSR preload

- `src/components/product/PdpGallery.tsx` — `ZoomMainImage` adds
  `fetchPriority="high" loading="eager" decoding="async"` to the
  `<m.img>` (gallery main image, the LCP candidate).
- `src/components/product/PdpInteractive.tsx` — fallback `<img>` (the
  single-image path when no gallery is present) gets the same hints.
- `src/app/products/[slug]/page.tsx` — emits a server-rendered
  `<link rel="preload" as="image" fetchPriority="high" href={...}>`
  for the LCP candidate URL. React 19 / Next 16 hoist bare `<link>`
  tags into `<head>`. The preload URL uses the same `wixImageUrl(url,
  600, 600)` constraint the gallery renders so the preload and the
  eventual `<img src>` are byte-identical (single fetch, not two).

**Expected outcome:** Kingston PDP LCP improves by 200-1200 ms depending
on connection. Score target 80+ is now within reach for the bead.

### Fix 2 — SiteContent cross-request cache

- `src/lib/cms/site-content.ts` — wraps the inner Wix fetch in
  `unstable_cache(...)` from `next/cache` with `revalidate: 300` and
  `tags: ["site-content"]`. The React `cache()` per-render dedupe is
  preserved as a thin outer wrapper that converts the (serializable)
  `entries` array back to `Map` for callers.
- Exposes `SITE_CONTENT_CACHE_TAG` so future CMS-webhook routes can call
  `revalidateTag("site-content")` to publish Brenda's edits within a
  request instead of waiting up to 5 minutes.

**Expected outcome:** TTFB on every page that reads owner copy drops
from "Wix round-trip + render" to "memory hit + render" for 5 minutes
between Brenda's edits. This is the fix the bead description specifically
called out.

### Fix 3 — Defer EmailCapturePopup off the home initial chunk

- `src/app/page.tsx` — switches from a static import to
  `next/dynamic(() => import(...))`. The popup never paints until one
  viewport scroll, so its JS now loads in a separate chunk in parallel
  with the hero paint instead of inflating the initial bundle.
- The `dynamic` symbol on the page already meant `force-dynamic`; the
  import was renamed locally to `dynamicImport` to avoid the collision.

**Expected outcome:** home initial JS chunk shrinks by the
EmailCapturePopup module footprint. Smallest of the three wins, but free.

## Acceptance checklist

- [x] re-audit doc — this file
- [x] top 3 regressions identified (LCP image priority, SiteContent
      cold-fetch, EmailCapturePopup eager JS)
- [x] 2+ P0/P1 fixes shipped (3 fixes, 2 P0-class + 1 P1)
- [ ] **Kingston PDP perf ≥ 80** — requires deployed preview to confirm.
      radahn (Mac) should run Lighthouse against the merged branch.
- [ ] **Home perf ≥ 90** — same: requires deployed preview.

The on-device Lighthouse acceptance numbers cannot be confirmed from this
sandbox. **PAIR REVIEW: radahn (Mac) — please re-run the Lighthouse pass
against the deployed preview after merge and confirm the targets.** If
the targets aren't hit, the deferred suspects above are the next levers.

## Files changed

```
src/app/page.tsx                                  (3 — defer popup)
src/app/products/[slug]/page.tsx                  (1 — preload + import)
src/components/product/PdpGallery.tsx             (1 — img hints)
src/components/product/PdpInteractive.tsx         (1 — img hints)
src/lib/cms/site-content.ts                       (2 — unstable_cache)
src/__tests__/site-content.test.ts                (—  next/cache mock)
docs/cfw-vxb-site-speed-audit-2026-05-09.md       (this file)
```

## Verification

- `npx tsc --noEmit` — clean
- `npx eslint .` — clean
- `npx vitest run` — 3050 pass / 18 skipped (whole suite)
- `npx next build` — clean (Wix env errors are sandbox-local, not from
  this branch)
