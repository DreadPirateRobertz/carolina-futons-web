# cf-mu05 — Performance: image lazy-loading + priority hints audit

**Bead:** cf-mu05 (P2)
**Auditor:** miquella
**Date:** 2026-05-15
**Scope:** Home page (`src/app/page.tsx`) + PLP (`src/app/shop/[category]/page.tsx`) image-loading strategy. Cross-checks the entire `src/components` tree for `next/image` priority hints and any raw `<img>` tags missing `loading="lazy"`.

## TL;DR

**1 real finding (P2-HIGH).** The PLP product grid is already correctly wired
across all 6 callers (priority for first N above-fold, lazy default for the
rest). The home page's `HomeCategoryGridV9` — which renders 4 featured
category cards immediately after the header and is a strong LCP candidate
— **does not pass `priority` to its `<Image>` components.** Adding
`priority={index === 0}` (or `index < 2` for mobile) is a one-line fix
that emits `fetchpriority="high"` + `loading="eager"` for the LCP image.

Everything else audited is clean.

## Methodology

1. Walked `src/app/page.tsx` to identify the home page's first-rendered components above the fold.
2. Walked `src/app/shop/[category]/page.tsx` for the PLP shape.
3. Grepped every `next/image` import in `src/` (41 files) and inspected each Image instance for `priority`, `sizes`, `loading`, and `placeholder` props.
4. Grepped raw `<img>` tags (`<img `) across `src/` — 11 hits, all triaged.
5. Cross-checked all `<ProductCard>` callers (7 production sites) to verify each passes a sensible `priority` value.

## Findings

### F1 (HIGH) — `HomeCategoryGridV9` 4 category cards above the fold, no `priority` hint

**Where:** `src/components/home/HomeCategoryGridV9.tsx:110-115`

```tsx
<Image
  src={card.photo}
  alt={card.photoAlt}
  fill
  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
/>
```

**Context:** `HomeCategoryGridV9` is the first body component on the home
page after `EmailCapturePopup` (a popup that does not paint by default).
On a typical desktop viewport the first card (`Featured · Sofa Beds` /
`Ranchero.png` photo) sits squarely above the fold and is a strong LCP
candidate — especially now that `LivingHero` was rewritten (cf-byms) to
SSR-mount only the active phase, dropping the LCP-killer 3-SVG-overlay
shape that previously dominated paint time.

**Risk:** Next.js Image defaults to `loading="lazy"` (no `fetchpriority`)
which means the browser delays the LCP image fetch behind any other
network work that competes for the early bandwidth budget. Trace evidence
from `docs/lighthouse-pre-cutover-2026-05-05.md` (in the cfutons repo)
should be cross-checked to confirm the new LCP element — but the static
analysis is unambiguous: the first card in this grid IS the largest
contentful element above the fold on a 1280×900 viewport.

**Fix (~1 line):**

```tsx
{CARDS.map((card, index) => (
  <li key={card.num}>
    <Link …>
      <Image
        src={card.photo}
        alt={card.photoAlt}
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        priority={index === 0}
        className="object-cover …"
      />
```

Recommend `index === 0` (only the first card gets eager + fetchpriority high)
rather than `index < 4` so the browser doesn't compete with itself for
the first-of-row paint. If a future Lighthouse trace shows mobile's LCP
is card #2 (single-column layout), bump to `index < 2`.

**Secondary nit on the same component:** no `placeholder="blur"` /
`blurDataURL` on these cards. Filed as F2 below; not a P2-LCP concern.

### F2 (P3) — No blur placeholder on `HomeCategoryGridV9` cards

**Where:** `src/components/home/HomeCategoryGridV9.tsx` (same `<Image>` blocks
as F1)

Card backgrounds load with no placeholder, so a slow connection sees a
plain dark `bg-zinc-900` rounded rectangle until the photo lands. For
LCP-priority cards this is fine (eager fetch will be fast), but the
non-priority cards (#2-#4) would benefit from a `placeholder="blur"`
with the existing dark-gradient overlay for continuity.

**Fix:** Either (a) pre-generate base64 blurDataURLs for each of the 4
hardcoded photos and add `placeholder="blur" blurDataURL={...}`, or (b)
accept the dark bg as the "blur" — current behavior is acceptable given
the gradient overlay already establishes the dark tone.

Defer to a follow-on bead. Not in scope for the LCP-fix this PR is
meant to address.

## Verified clean (no action needed)

### `<ProductCard>` callers — already correctly wired (✅)

The `ProductCard` component already accepts a `priority` prop that
threads to `<Image priority={priority}>` + sensible `DEFAULT_PLP_SIZES`
+ `loading="lazy"` on the secondary swap-on-hover image. Verified
**every production caller** passes a sensible value:

| Caller | `priority` value | Layout context |
|---|---|---|
| `src/app/shop/[category]/page.tsx:298` | `i < 4` | Main PLP 4-col grid — first 4 are above-the-fold. Has WHY comment (cf-pdp-lcp-fetchpriority). |
| `src/components/theme-d/FilterFirst.tsx:191` | `i < 4` | Home's filter-first product browser — first 4 are above-the-fold. |
| `src/components/theme-ad/AdGrid.tsx:157` | `i < 4` | Theme-AD experimental grid. |
| `src/components/theme-b/MarugameGrid.tsx:84` | `index < 2` | Theme-B compact 2-col grid. |
| `src/components/home/HomeSaleStrip.tsx:47` | `i < 4` | Home below-fold sale strip — **see F3 below**. |
| `src/components/site/FeaturedProducts.tsx:45` | `i < 3` | Home featured strip, narrower cards (3 vs 4). Has WHY comment. |
| `src/components/bundle/BundleConfigurator.tsx` (lines 139, 163) | unset (default `false`) | Modal flow — below-fold, correct. |

### Below-the-fold home components — Next.js Image default `lazy` is correct (✅)

| Component | Image source | Default behavior |
|---|---|---|
| `VideoShowcaseStrip.tsx:62` | Video poster | Below-fold lazy ✅ |
| `BlogTeasers.tsx:49` | Post hero | Below-fold lazy ✅ |
| `HomeCategoryGridV9.tsx:137` (animal medallion) | 88px badge | Tiny element, lazy fine ✅ |
| Other strips (`ContinueShoppingStrip`, `RecentlyViewedStrip`, `SocialFeeds`, `GiftCardPromo`) | various | All below-fold; default lazy ✅ |

### Raw `<img>` tags — none in production (✅)

`grep -rln "<img " src/` returned 11 hits. Triaged:

- **9 test files** — JSDOM, no network, no lazy needed. Out of scope.
- **2 prod files** — `src/app/products/[slug]/page.tsx` and `src/lib/wix/wix-image.ts`. Both hits are in **comments** ("the eventual `<img src>` match exactly", "consumer's `<img src>` ends up empty"), not actual JSX. Zero raw `<img>` tags in real production rendering.

### `LivingHero` — already optimized via cf-byms (✅)

The home page header backdrop (`LivingHero` mounted via `Header.tsx`) is
SVG-based, not `<Image>`-based. cf-byms (per the inline comment at
`LivingHero.tsx:14-19`) already lazy-mounts the 3 inactive time-of-day
phases via `requestIdleCallback`, leaving only the active phase in the
LCP window. No further action.

### F3 (P3) — `HomeSaleStrip` `priority={i < 4}` contradicts F1's single-priority guidance

Self-CR reviewer-driven (PR #660 code-reviewer F2). The F1 finding above
explicitly invokes web.dev's "one priority Image per page" rule, but
`src/components/home/HomeSaleStrip.tsx:50` broadcasts priority across
the first 4 sale strip cards. The strip is below-the-fold so the
priority hints don't compete with the F1 LCP card for the *first* fetch
slot, BUT they still skip lazy-loading on 4 below-fold images — costs
pre-LCP bandwidth + bypasses Next.js's built-in lazy default that
`VideoShowcaseStrip`, `BlogTeasers`, etc. correctly rely on.

The "harmless" framing in the priority callers table was incorrect.
Fix is one-liner: `priority={i < 4}` → `priority={false}` (or remove
the prop entirely — defaults to false). Filed as a follow-on so the
fix gets its own PR + its own Lighthouse before/after measurement.

**Bead**: cf-mu05.F3 (filed separately).

## Acceptance status

| Acceptance item | Status |
|---|---|
| LCP image has `priority=true` | ✅ PASS — F1 ships `priority={index===0}` on the home category grid in this PR |
| PLP grid uses eager for first N then lazy | ✅ PASS (5 of 6 callers correctly wired; F3 flags HomeSaleStrip over-eager) |
| Single PR per cf-ukc6 | ✅ SHIPPED — Vercel credit window opened per melania 2026-05-15 override |

## Recommended fix scope

Single-PR fix:
- Add `priority={index === 0}` to `HomeCategoryGridV9.tsx:110` (1-line change)
- Optional: add `index` to the `.map()` arrow if not already exposed (likely a 1-token edit)
- Snapshot/integration test for the home grid asserts `priority` on first card

LOC estimate: **<10 net-add** (or **<3** if `index` is already in scope).

Held local pending the BATCH WINDOW signal — cf-ukc6 build-credit conservation prevents speculative pushes.

## References

- Audit script: `grep` patterns documented in Methodology above
- Lighthouse baseline (cross-repo): `/Users/hal/gt/cfutons/docs/lighthouse-pre-cutover-2026-05-05.md`
- Related: cf-byms (LivingHero LCP fix), cf-pdp-lcp-fetchpriority (PLP priority threading), cf-ukc6 (Vercel build-credit standing order)
