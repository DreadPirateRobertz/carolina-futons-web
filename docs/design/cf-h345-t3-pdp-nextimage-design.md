# cf-h345 Track 2: next/image swap for PdpGallery main image (DESIGN)

**Status:** DESIGN PROPOSAL — independent of cf-0klm; ships separately
**Bead:** cf-h345 (P3, Track 2 — formerly "next/image swap for PdpGallery")
**Author:** godfrey
**Date:** 2026-05-16

---

## Problem

cf-0oj5 baseline (cf-sd80 2026-05-16): kingston PDP Lighthouse perf 68 / LCP 7.3s. Two pre-diagnosed root causes from the bead:

1. **TTFB-dominated** — addressed by cf-0klm (ISR via consent-extraction)
2. **`<m.img>` not Next.js Image** — `PdpGallery.tsx:440` uses framer-motion `m.img` with `wixImageUrl(src, 600, 600)` returning a single pre-sized URL. No automatic srcset, no AVIF/WebP, no responsive variants. The image is the LCP candidate per `cfw-vxb` comment.

This document covers root-cause #2. Independent of cf-0klm — image optimization works whether the route is dynamic-render or ISR-cached.

---

## Current implementation analysis (`PdpGallery.tsx:438-465`)

The `ZoomMainImage` subcomponent is doing FIVE things at once:

| Concern | Current expression |
|---|---|
| Image rendering | `<m.img src={wixImageUrl(...)}>` |
| LCP priority hints | `fetchPriority="high" loading="eager" decoding="async"` |
| Scroll-driven scale (1→1.05→1) | framer `useScroll` + `useTransform` → `style.scale` |
| Opacity crossfade between thumbs | framer `initial/animate/transition` props + `key` remount |
| View-transition handoff between PDPs | `viewTransitionName: VT_NAME` style |

All five live on the SAME element. Swapping to Next.js `<Image>` requires preserving each.

---

## Proposed architecture: wrapper-and-image split

```text
<div ref={containerRef}>                   // useScroll target — unchanged
  <m.div                                   // framer animation surface
    key={crossfadeKey-or-static}           // mount-on-thumb-change
    style={{ scale, viewTransitionName }}  // baseStyle moves to wrapper
    initial/animate/transition             // crossfade on wrapper
    className="aspect-square w-full"
  >
    <Image                                 // next/image — LCP surface
      src={src}                            // RAW wix URL (not wixImageUrl-pre-sized)
      alt={alt}
      width={1200}
      height={1200}
      priority                             // → fetchPriority=high + loading=eager
      data-testid="pdp-main-image"
      onError={onImgError}
      sizes="(max-width: 768px) 100vw, 600px"
      className="aspect-square w-full object-contain"
    />
  </m.div>
</div>
```

**Key shifts:**

1. **m.div wraps Image** — framer animations (scale, crossfade, view-transition) move to the wrapper. The IMG inside is a plain `<Image>` with optimization hints.
2. **`priority` prop replaces fetchPriority+loading+decoding** — next/image emits all three browser hints when `priority={true}`. Equivalent or better than the manual triple.
3. **Pass raw Wix URL (drop wixImageUrl)** — Vercel's image optimizer (via `/_next/image?url=...&w=...`) handles resizing + format negotiation. Wix's own `/v1/<mode>/<params>/` resize is bypassed in favor of Vercel's pipeline (which generates srcset for all `deviceSizes` + serves AVIF/WebP).
4. **Explicit `width`/`height` (1200/1200)** — must be set since this isn't `fill` mode. 1200 is the 2× retina target for a 600px CSS viewport; matches what `wixImageUrl(src, 600, 600)` currently requests.
5. **`sizes` attribute** — tells the browser which srcset variant to fetch based on viewport. `(max-width: 768px) 100vw, 600px` means "mobile gets full-width image, desktop gets 600px". Vercel generates matched variants.

---

## Why this preserves view-transitions

The browser-native view-transition pseudo-element morphs whatever element carries `view-transition-name: <name>`. Moving the style from `<m.img>` to `<m.div>` morphs the wrapper rectangle instead of the image element. The visual effect is identical (rectangle → rectangle morph between PDP states) because the image fills the wrapper completely (`aspect-square w-full`).

The view-transition contract is unchanged for callers.

---

## Why this preserves the framer scale + crossfade

- **scale**: `useScroll` still targets `containerRef` (unchanged); `useTransform` outputs to `style.scale` on the wrapper. The Image inside scales with the wrapper via normal CSS transform — same visual result.
- **crossfade**: `initial/animate/transition` on the wrapper, with `key={crossfadeKey}` forcing remount. The Image inside fades with the wrapper. Same visual result.

Both are 1:1 ports.

---

## Why drop wixImageUrl for the main image

Today: `wixImageUrl(src, 600, 600)` rewrites the Wix media URL to request `/v1/fit/w_1200,h_1200,q_85/<file>` — pre-sized, single size, no srcset.

Proposed: pass the RAW Wix URL. Vercel's image optimizer (at `/_next/image?url=<encoded-wix-url>&w=<variant>`) fetches the original from Wix, transcodes to AVIF/WebP, and serves device-appropriate variants from Vercel's CDN. The browser picks the right variant via srcset.

**Wins:**
- AVIF/WebP format negotiation (Wix doesn't serve these natively)
- Multiple size variants via srcset (mobile / tablet / desktop / retina)
- CDN-cached variants (Wix's CDN cached one size; Vercel caches all variants)

**Trade-offs:**
- First request to a new image pays the Vercel optimization cost (one-time per variant)
- Vercel image-optimization minutes consumed (covered by Pro plan)
- next.config remotePatterns must allow `static.wixstatic.com/media/**` (already configured per cf-93rb Phase A)

`wixImageUrl(...)` stays in the codebase for non-Image consumers (e.g. CSS background-image, server-side OG image generation) — only the PdpGallery main image swaps.

---

## Test surface

| File | Purpose | Cases |
|---|---|---|
| `src/__tests__/PdpGallery.test.tsx` (modify existing) | Pin Image element with raw Wix URL, `priority` prop, width/height, sizes, framer scale/crossfade/VT-name on wrapper | 8 modified |
| `e2e/pdp-image-srcset.spec.ts` (new) | Network ordering: assert main image fetches as AVIF/WebP via `/_next/image` proxy | 1 |
| `e2e/pdp-lcp.spec.ts` (new, optional) | Playwright LCP measurement against the kingston PDP — fail if LCP > 3.5s on a slow-3G profile | 1 |

The existing 51 PdpGallery tests stay green with the wrapper-and-Image structure (test the existing data-testid + className contract).

---

## Lighthouse expected impact (without cf-0klm)

Today (dynamic-render):
- LCP 7.3s — split roughly TTFB (4-5s, Wix SDK + dynamic SSR) + image fetch+decode (2-3s, single-size JPEG)

With this fix (still dynamic-render):
- LCP estimated 5-6s — TTFB unchanged, image cost drops 1.5-2.5s via AVIF + correct-size variant

With cf-0klm + this fix combined:
- LCP estimated 1.5-2.5s — TTFB drops to ~200ms (ISR HIT), image cost stays low

**This fix alone gets within shouting distance of the 3.5s target but probably doesn't clear it.** Real value: closes the image-optimization root cause so when cf-0klm lands, the combined effect is decisive.

Worth shipping independently of cf-0klm because:
- Image optimization is a per-pixel content improvement (less data over the wire, faster decode)
- Mobile users gain disproportionately (smaller srcset variants)
- Vercel image-optimization is paid for; not using it leaves money on the table

---

## Risk + rollout

**Risks:**

1. **Vercel image-optimization minutes**: each unique (url, width) pair consumes a minute. cf-ukc6 conservation note — first deploy will burn some budget warming the cache. Mitigation: deploy off-peak.
2. **OG/social-share images**: confirm `<meta property="og:image">` still uses `wixImageUrl(...)` directly (NOT `<Image>`) — meta tags need absolute Wix URLs that crawlers can fetch without Vercel auth.
3. **LCP measurement instability**: Lighthouse runs vary ±15%. Confirm three preview runs trend the same direction before declaring success.

**Rollout phases:**

1. **Phase 1 (this PR):** docs + test stubs only — no code change. Crew + Stilgar review the architecture.
2. **Phase 2 (cf-h345.t3.impl):** code change to PdpGallery only + test bodies + Vercel preview Lighthouse verification.
3. **Phase 3:** if Lighthouse perf < 80 still (with cf-0klm pending), evaluate cf-c736 (generateStaticParams) as next lever.

---

## Refs

- cf-0oj5 PR #704 (TTFB ISR fix, merged but no-op pending cf-0klm)
- cf-h345 parent bead — Track 2 of 4 (Track 1 = blaidd's PR #706 wrapper, shipped; Track 3 = cf-c736 generateStaticParams)
- cf-0klm (ISR unblock — gated on mayor approval)
- Next.js Image API: https://nextjs.org/docs/app/api-reference/components/image
- Vercel image-optimization pricing + behavior: https://vercel.com/docs/image-optimization
