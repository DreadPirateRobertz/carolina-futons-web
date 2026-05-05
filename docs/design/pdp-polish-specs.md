# PDP polish — design specs

**Author:** blaidd (cfutons/crew)
**Date:** 2026-05-05
**Audience:** the polecat that picks up each of the four queued features below.
**Source-of-truth tokens:** `src/app/globals.css` (`--cf-cta`, `--cf-cream`, `--cf-sand`, `--cf-divider`, `--cf-charcoal`, `--cf-error`).
**Existing scaffolding:** `src/components/product/{PdpReviews,BnplWidget,PdpStickyCta,ProductSpinViewer}.tsx`.

These are *visual + interaction* specs — not implementation plans. ASCII sketches read top-to-bottom; treat them as wireframes, not pixel-precise mockups. Where motion is specified, the values are tuned for the existing `framer-motion` LazyMotion `domAnimation` bundle (no `domMax`).

All four sections obey the same global rules:

- **Reduced-motion:** every animation must collapse to instant state changes when `useReducedMotion()` returns `true`.
- **Touch targets:** any interactive element ≥ 40 × 40 px (WCAG 2.5.5).
- **Contrast:** text on `cf-cream` ≥ 4.5:1; non-text icons ≥ 3:1.
- **No CLS:** every dynamic block reserves space at SSR (skeleton or fixed `min-height`).
- **No new tokens** — palette is closed; pull what you need from the list above.

---

## 1. Stamped review widget — visual layout

**Replaces:** the fixture-fed `PdpReviews.tsx` once Stamped.io (or whatever the cfw-49h research lands on) is wired.
**Surface:** below the buy-box, above `PdpAlsoBought` cross-sell.

### 1.1 Block anatomy

```
┌──────────────────────────────────────────────────────────────────┐
│  ★★★★★  4.8   (127 reviews)             [ Write a review ]      │  ← header row
│  ────────────────────────────────────────────────────────────    │  ← cf-divider hairline
│                                                                  │
│  Rating distribution                                             │
│  5 ████████████████████ 92                                       │  ← 5 horizontal bars
│  4 ██████████  21                                                │     gradient cf-cta → cf-cta/30
│  3 ███         6                                                 │     2px border-radius
│  2 █           4                                                 │     count right-aligned tabular
│  1 █           4                                                 │
│                                                                  │
│  ────────────────────────────────────────────────────────────    │
│  Filters:  [ All ] [ With photos (12) ] [ 5★ ] [ 4★ ] [ 3★ ]    │  ← chip row, horizontal scroll on mobile
│  Sort:    Most recent  ▼                                         │  ← native <select>, right-aligned md+
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │  ← review card
│  │ ★★★★★   "Solid as a tank"                                  │  │
│  │                                                            │  │
│  │ Frame creaks zero — unlike the IKEA piece it replaced…     │  │  ← body, max 6 lines clamp
│  │ [ Read more ]                                              │  │
│  │                                                            │  │
│  │ Sarah M. · Asheville, NC · Mar 12 2026                     │  │  ← attribution row
│  │ Verified buyer ✓                                           │  │  ← cf-cta tint pill
│  │                                                            │  │
│  │ ┌─────┐  ┌─────┐                                          │  │  ← UGC thumbnails, 80px square
│  │ │     │  │     │  +2                                       │  │     (open lightbox on click)
│  │ └─────┘  └─────┘                                          │  │
│  │                                                            │  │
│  │  ┌────────────────────────────────────────────────────┐   │  │  ← merchant reply card
│  │  │ Carolina Futons replied · Mar 13 2026              │   │  │     bg cf-sand
│  │  │ Thanks for the kind words, Sarah — glad it's…      │   │  │     border-l-2 cf-cta
│  │  └────────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──── card ────┐  ┌──── card ────┐  ┌──── card ────┐           │  ← three more cards (md+ grid)
│  │                                                              │
│  [          Show more reviews          ]                         │  ← outline button, cf-cta border
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Stars

- **Glyph:** filled `★` (existing pattern in `TestimonialsStrip.tsx`); pixel size 16 px on cards, 20 px on the header row, 12 px on the merchant-reply card.
- **Color:** `cf-cta` for filled, `cf-divider` for empty. **Do not** use yellow/gold — keeps the page palette consistent with the buy-box CTA.
- **Density:** 2 px tracking between glyphs. Number badge (`4.8`) sits 8 px to the right of the strip, same baseline.
- **A11y:** wrap the row in `<span role="img" aria-label="4.8 out of 5 stars (127 reviews)">`. Hide individual glyphs from the AT tree.

### 1.3 Filter chips

- Visual: `inline-flex h-8 px-3 rounded-full text-sm border border-cf-divider bg-cf-cream`.
- Selected: `border-cf-cta bg-cf-cta text-white`. **No** color-only selection — selected chip also adds a 14 × 14 check icon left of the label.
- Disabled (zero matches): 60% opacity, `cursor-not-allowed`, `aria-disabled`.
- Mobile: chips overflow into a horizontal `overflow-x-auto` row with `snap-x snap-start`. No scrollbar arrow affordance — lean on momentum scroll.

### 1.4 Merchant-reply card

- Indented 24 px from the parent card's left edge so it reads as nested.
- `bg-cf-sand` + `border-l-2 border-cf-cta` (left rail).
- Reply timestamp uses the same date format as the review; never render as "X days ago" on initial paint (CLS / hydration mismatch risk).
- If the merchant-reply field is empty, render nothing (no empty card frame).

### 1.5 States

| State | Visual |
| --- | --- |
| Loading | Skeleton: header row + 3 card-shaped boxes at fixed `min-height: 180px`. Use `animate-pulse` on `bg-cf-divider`. |
| Empty (real zero reviews) | Single cream card: "Be the first to review the {productName}." + "Write a review" CTA. Hide rating-distribution block. |
| Fetch error | Same shell as empty, copy: "We couldn't load reviews right now. [Retry]." Retry triggers a cache-bust refetch. |

### 1.6 References

- Existing fixture-driven layout: `src/components/product/PdpReviews.tsx`.
- Star-rating accessibility pattern: `src/components/site/TestimonialsStrip.tsx` (`role="img"` + aria-label).
- Source migration: `docs/decisions/cfw-49h-gbp-research.md` (cfw-13y).

---

## 2. BNPL widget — logo sizing + expand interaction

**Component:** `src/components/product/BnplWidget.tsx` (already shipped as cfw-8cx).
**Polish goal:** keep messaging-only static SSR; tighten brand chip presentation and the expand affordance so the surface reads as "trustworthy financing teaser," not "buried disclaimer."

### 2.1 Collapsed state

```
┌──────────────────────────────────────────────────────────────┐
│  As low as  $66.58/mo  with  [Affirm]   [Afterpay]   ⌄       │  ← collapsed row
└──────────────────────────────────────────────────────────────┘
                                                                ↑
                                      chevron rotates 180° on expand
```

- Container: `mt-2 px-4 py-3 rounded-md bg-cf-cream border border-cf-divider hover:border-cf-cta`.
- Heading text size: `text-sm font-medium text-cf-charcoal`.
- "$66.58/mo" emphasized via `font-semibold text-cf-cta`. **Tabular nums** so the number doesn't reflow on price change (`tabular-nums`).
- Brand chips inline; not a separate row.

### 2.2 Brand chips

- Affirm: SVG wordmark, height **16 px**, color `#0FA0EA` (Affirm brand spec).
- Afterpay: SVG wordmark, height **14 px** (Afterpay's mark is taller — visually balance with a slightly smaller height), color `#B2FCE4` background → `#000` text. Use the chip-style mark, not the wordmark on plain ground.
- Wrap each chip in `inline-flex items-center px-1.5 py-0.5 rounded`. 4 px gap between them (`gap-2`).
- **Never** color-only — chips must include the readable wordmark.
- Provide raster fallback `<noscript>` with the same logos as PNG (Affirm/Afterpay specs require legibility even with brand fonts blocked).

### 2.3 Expand interaction

- Click target: the entire row, not just the chevron. Implement as `<button type="button" aria-expanded={open} aria-controls={panelId}>`.
- Motion (LazyMotion friendly):
  - Panel height: `auto` ↔ collapsed (`framer-motion` animate height with measure-and-set strategy; or CSS Grid with `1fr 0fr` keyframes which respects reduced motion natively).
  - Duration: 240 ms `cubic-bezier(0.32, 0.72, 0, 1)`.
  - Chevron rotate: 0° → 180°, same easing/duration.
  - **Reduced motion:** drop both transforms; chevron snaps, panel toggles `display`.
- Panel layout (expanded):

```
┌──────────────────────────────────────────────────────────────┐
│  As low as  $66.58/mo  with  [Affirm]  [Afterpay]   ⌃        │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  4 payments of   $199.75    biweekly                         │
│  12 payments of  $66.58     monthly · 0% APR                 │
│  24 payments of  $33.29     monthly · APR varies             │
│                                                              │
│  Subject to approval. APR and term shown at checkout.        │  ← text-xs text-cf-charcoal/70
└──────────────────────────────────────────────────────────────┘
```

- Three rows in a `grid grid-cols-[max-content_max-content_1fr] gap-x-3`. Numbers tabular-nums, right-aligned.
- Disclaimer line gets `text-xs text-cf-charcoal/70` and stays on a single line on md+; wraps gracefully on mobile.

### 2.4 Below-minimum behavior

- If `unitPriceCents < BNPL_MIN_CENTS` (already $50 in code), render **nothing**. Don't show "BNPL not available for this item" — that adds noise. Tested by `PdpFinancing` consumers.

---

## 3. Sticky CTA bar — position + motion

**Component:** `src/components/product/PdpStickyCta.tsx` (already shipped through cf-3qt.7.M.3).
**Polish goal:** dial the appearance/dismiss motion so the sheet reads as helpful, not pushy. Settle the desktop variant as well.

### 3.1 Desktop (md+)

```
viewport ───────────────────────────────────────────────────
                                                            │
                          (page content)                    │
                                                            │
                                                            │
┌──────────────────────────────────────────────────────────┐│  ← sticky bar, full width, h-16
│ ◐ Kingston Futon Frame · Full · $799.00   [ Add to cart ]││     bg-cf-cream/95 backdrop-blur
│                                  qty: [-] 1 [+]          ││     border-t border-cf-divider
└──────────────────────────────────────────────────────────┘│     shadow-[0_-1px_4px_rgba(0,0,0,0.04)]
viewport ───────────────────────────────────────────────────
```

- Bar appears once the primary `<AddToCartButton>` scrolls out of view (existing IntersectionObserver wiring). Do not show on initial paint.
- **Entrance:** translate-y from `+100%` → `0`, 220 ms cubic-bezier(0.32, 0.72, 0, 1), opacity 0 → 1.
- **Exit:** symmetric — bar slides out below the viewport, 200 ms ease-in.
- Reduced-motion: instant fade with no translate.
- Z-index: above page content, **below** site-nav on scroll-up. Pin to `z-30` (site nav lives at `z-40`).

### 3.2 Mobile (<768px) — bottom sheet

```
                  ╶─╴      ← drag handle, w-10 h-1 rounded-full bg-cf-divider/80
┌───────────────────────────────────────────┐
│                                           │
│  ◐ Kingston Futon Frame                   │
│  Full · $799.00                           │
│                                           │
│  qty: [ - ]  1  [ + ]                     │
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │           Add to cart               │  │  ← cf-cta, h-12, full width
│  └─────────────────────────────────────┘  │
│                                           │
└───────────────────────────────────────────┘
```

- Surface: `rounded-t-2xl bg-cf-cream` with `shadow-[0_-2px_16px_rgba(0,0,0,0.10)]` and a 1 px top border (`border-t border-cf-divider`).
- Drag handle: 40 × 4 px, 8 px from the top, color `cf-divider/80` (decorative — NOT a drag pivot, the entire sheet is the drag surface). Don't make the handle clickable.
- **Entrance:** spring `{ type: "spring", stiffness: 320, damping: 32 }`, sliding from `y: 100%`. Existing `m.div` already does this — keep the values in code as the source of truth.
- **Swipe-to-dismiss:** vertical drag ≥ 80 px (`SWIPE_DISMISS_THRESHOLD_PX` constant in code). Once dismissed, the sheet stays hidden until the primary CTA re-enters and exits the viewport again — **not** until next page load. Reset hook: the existing `visible` prop flipping false → true.
- **Reduced-motion:** sheet appears with no transform, no spring; simply toggles `display`.
- **Safe-area:** add `pb-[env(safe-area-inset-bottom)]` to the sheet container so the CTA clears the iOS home indicator.

### 3.3 Edge cases

- When the page has no purchasable variant selected, render the bar disabled (CTA: "Choose options" linking to the variant picker via anchor, not a separate route).
- When stock is `OUT_OF_STOCK`, swap "Add to cart" → "Notify me" (matches `PdpNotifyMe.tsx` behavior).
- When the cart drawer is open, hide the sticky bar (avoid two layered surfaces).

---

## 4. 360 Spin Viewer — drag affordance + gesture cues

**Component:** `src/components/product/ProductSpinViewer.tsx`.
**Polish goal:** the viewer works but discoverability is poor — first-time visitors don't know it spins. Fix with a one-shot affordance plus persistent passive cues.

### 4.1 Surface

```
┌────────────────────────────────────────┐
│                                        │
│            [ product image ]           │
│              (current frame)           │
│                                        │
│                                        │
│                                        │
│                                        │
│                                        │
│  ╔══════════════════════════════════╗  │  ← onboarding overlay, see §4.2
│  ║   ⟳   Drag to spin   ⟲           ║  │     auto-fades after 3s OR first drag
│  ╚══════════════════════════════════╝  │
│                                        │
│       ┌──────────┐         ↻ replay    │  ← persistent cue strip, see §4.3
│       │ ●  ────  │                     │
│       └──────────┘                     │
└────────────────────────────────────────┘
                    ▲
                  bottom inset 16 px
```

### 4.2 Onboarding overlay (one-shot, per-session)

- Triggered by **either**: viewer enters the viewport for the first time, **or** total time on PDP > 6 s without a spin interaction.
- Visual: 80% opaque `bg-cf-charcoal/85` capsule, 12 px vertical / 20 px horizontal padding, centered horizontally over the image, anchored 32 px above the persistent cue strip.
- Glyphs: ⟳ + ⟲ rotating subtly (8° ↔ −8°, 1.4 s ease-in-out, infinite). Reduced-motion: glyphs hold static.
- **Auto-dismiss:** 3 s after appearing, **or** the moment the user drags ≥ 8 px on the viewer (whichever comes first).
- **Persist dismissal:** sessionStorage key `cf-spin-onboarded` so re-entering the viewer on the same session is silent. Do NOT use localStorage — the cue is cheap and helpful on a returning visit.

### 4.3 Persistent cue strip (always visible)

- Bottom-left inside the viewer: a 64-frame **progress dot strip** showing the current frame index. Implemented as a single track (`bg-cf-divider`) with a 3 px-tall thumb (`bg-cf-cta`) whose left position maps to `currentFrameIndex / totalFrames`. Width 64 px — small, decorative.
- Bottom-right: ↻ replay icon — clicking it triggers the existing `buildAutoSpinSequence` auto-spin pass. Hover state: `text-cf-cta`. 24 × 24 hit target with extra 8 px padding for touch.
- Strip + replay sit on a `bg-cf-cream/80 backdrop-blur` rounded pill so they remain legible on dark hero shots.

### 4.4 Drag affordance (cursor + touch)

- Desktop hover: cursor switches to `grab`; while pointerdown, `grabbing`.
- Touch: no cursor; drag affordance is the onboarding overlay + the cue strip + a soft border highlight on first pointerdown:
  - On `pointerdown`, the viewer outline animates `0 → 1.5 px solid cf-cta`, 120 ms ease-out.
  - On `pointerup`, the outline fades back to none in 240 ms.
  - This single highlight pulse is enough; do not add a permanent border.
- Reduced-motion: skip the outline pulse; just keep the cursor swap.

### 4.5 Keyboard

- The viewer must be focusable (`tabIndex={0}`) with a visible focus ring (`outline-2 outline-cf-cta`).
- Left/Right arrow steps `±1` frame; Shift + Left/Right steps `±10` frames.
- Space toggles auto-spin.
- Announce frame change to AT only on focus + first interaction with `aria-live="polite"` text "Frame X of Y" rendered visually-hidden — debounced at 250 ms so a held arrow doesn't flood the AT queue.

### 4.6 Gesture cues — dos and don'ts

| Do | Don't |
| --- | --- |
| Auto-fade overlay after first drag | Block the image with a permanent overlay |
| Use ⟳/⟲ glyphs (universally legible) | Use the word "swipe" — visitors mix swipe/scroll |
| Show progress dots (passive depth cue) | Pulse the entire image to "draw the eye" — reads as broken |
| Reuse `cf-cta` for thumb + outline | Introduce a new accent color for the cue |

---

## 5. What this doc is **not**

- Not an implementation roadmap. The polecat picking up each section owns sequencing, file edits, and tests.
- Not a Figma replacement. ASCII sketches are deliberately rough so they survive copy-paste; the dimensions and tokens above are the load-bearing parts.
- Not a token expansion. Every color, radius, and shadow above pulls from `globals.css`. If you find yourself wanting a new token, push back to design first.

## 6. Open questions

- Stamped vs Google Reviews: the cfw-13y research recommends Places API → Stamped is one of several review-source candidates. If we land on Google instead, the §1 widget needs a small rename (s/Stamped/Reviews/) but the visual layout above still holds.
- BNPL provider sequencing: do we render Affirm first or Afterpay first? Recommend ordering by transaction volume — TBD with finance once the live SDK reports lands.
- Sticky CTA on tablet (md but touch-primary devices): do we keep desktop bar or drop the mobile sheet? Recommend desktop bar at md and up; the bar's auto-translate already works on touchscreens.
- Spin viewer onboarding TTL: per-session or per-product? Per-session is simpler and matches the "once per visit" UX intent; revisit if data shows users miss the cue across products.
