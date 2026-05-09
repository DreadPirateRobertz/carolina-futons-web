# Visual parity audit — cfw vs Wix Studio prod (2026-05-09)

**Bead:** cfw-y2i (P1)
**Author:** blaidd (cfutons/crew)
**Captured:** 2026-05-09 ~09:10 MT
**Origins:**
- **cfw**: `https://carolina-futons-web.vercel.app` (preview / latest)
- **prod**: `https://www.carolinafutons.com` (Wix Studio production)
**Capture script:** [`scripts/capture-parity.mjs`](../scripts/capture-parity.mjs) (Playwright + chromium, full-page, fully scrolled, 800 ms settle).
**Viewports:** 1280, 768, 375.

> **TL;DR.** Stilgar's "looks plain / static / sleek + beautiful" reaction is not one issue — it's three distinct gaps. (1) The cfw **PDP hero photo is small** compared to prod's centered large hero, and the buy-box surface is buried behind eight stacked cross-sell modules. (2) The **cfw home mobile experience is broken** by the consent / newsletter overlay landing on top of the hero. (3) The **LivingHero band repeats on every header** so its impact wears off. cfw is *richer* than prod almost everywhere else (footer, /about, /visit, cart-empty, V3 illustrations) — the gap is concentrated on PDP + home-mobile + the global header, not the whole site.

## Pages audited (8)

| Slug | cfw path | prod path |
| --- | --- | --- |
| home | `/` | `/` |
| shop-futon-frames | `/shop/futon-frames` | `/futon-frames` |
| shop-mattresses | `/shop/mattresses` | `/mattresses` |
| pdp-kingston | `/products/kingston-futon-frame` | `/product-page/kingston` |
| pdp-solstice | `/products/solstice-futon-frame` | `/product-page/solstice` |
| cart-empty | `/cart` | `/cart-page` |
| visit | `/visit` | `/contact` (no `/visit` on prod — closest peer) |
| about | `/about` | `/about` |

Three viewports per side = **48 captures**, all under [`docs/visual-parity-audit-2026-05-09/`](visual-parity-audit-2026-05-09/) split into `cfw/<vp>/` and `prod/<vp>/`. Compressed to JPEG q85 (~29 MB total) so the PR stays reviewable.

---

## Reading guide

- ✅ = cfw is **richer / better** than prod on this surface — preserve.
- ⚠ = cfw and prod are **roughly equivalent** — no action.
- ⛔ = cfw has a **regression vs prod** OR cfw has shipped richness that backfires (over-decorated / over-sectioned).

Each gap is tagged P0 (ship now), P1 (Stilgar's "plain/static" thread directly), or P2 (polish that didn't surface in the thread but matters for "sleek + beautiful").

---

## §1 — Home (`/`)

### Desktop (1280)

[cfw](visual-parity-audit-2026-05-09/cfw/1280/home.jpg) · [prod](visual-parity-audit-2026-05-09/prod/1280/home.jpg)

| Aspect | cfw | prod | Verdict |
| --- | --- | --- | --- |
| Above-the-fold hero | FilterFirst (typography "Find your perfect _____" + filter chips) — **no photographic hero** | Single-column dump of every product image — also no photographic hero, but raw catalog | ✅ structurally; ⛔ stylistically (no anchor photo at all) |
| Below-the-fold structure | Featured grid, value-prop band, testimonials, footer with mascot bear scene | Long product list → footer | ✅ |
| Total height | ~5500 px | ~16000 px | ✅ |

### Mobile (375)

[cfw](visual-parity-audit-2026-05-09/cfw/375/home.jpg) · [prod](visual-parity-audit-2026-05-09/prod/375/home.jpg)

⛔ **The consent / newsletter overlay lands directly on top of the cfw hero.** The "Stay in the loop" newsletter modal occupies roughly the top third of the visible viewport before the user can see the FilterFirst hero. Combined with the cookie banner stacked underneath, the first impression on mobile is "two modals over a thumbnail strip" — which reads as "plain / broken."

⛔ **No filter chips visible on mobile** in the captured state — they exist in code but the modal stack hides the section above them.

⛔ **Total scroll length on cfw mobile is ~16,000 px** (a single concatenated grid). prod is ~9,000 px. cfw is too long.

### Punch list

- **P0 — cfw-y2i.1**: defer the newsletter modal on home until the hero has been visible for ≥ 3 s (or move to a footer-anchored CTA). Today it auto-pops on mobile and steals the first viewport. *Files: `src/components/home/HomeNewsletterSection.tsx`, `src/components/site/NewsletterSignup.tsx`.*
- **P0 — cfw-y2i.2**: cookie consent banner should be a bottom-anchored sticky bar, not a corner card that overlaps content. Currently it lands in the right column on desktop and underneath the modal on mobile. *Files: cookie banner component (locate during impl).*
- **P1 — cfw-y2i.3**: add a photographic anchor to the cfw home hero. The FilterFirst typography + chips are good for utility, but Stilgar's "sleek + beautiful" reaction is partly because there's no large product/lifestyle photo above the fold. Two options: (a) anchor a single editorial photo to the right of the FilterFirst column at md+, (b) use the LivingHero day-phase MascotWorldHero behind a dimmed overlay. Prefer (a) — photographic, not illustrative.

---

## §2 — PDP (Kingston, Solstice)

### Desktop (1280)

[cfw Kingston](visual-parity-audit-2026-05-09/cfw/1280/pdp-kingston.jpg) · [prod Kingston](visual-parity-audit-2026-05-09/prod/1280/pdp-kingston.jpg)
[cfw Solstice](visual-parity-audit-2026-05-09/cfw/1280/pdp-solstice.jpg) · [prod Solstice](visual-parity-audit-2026-05-09/prod/1280/pdp-solstice.jpg)

This is the surface where **Stilgar's "plain" reaction is loudest** — and it's the opposite of what the word implies.

| Aspect | cfw | prod | Verdict |
| --- | --- | --- | --- |
| Gallery hero size | ~360 × 240 px main image with vertical thumbnail strip on the left | ~720 × 540 px centered hero with a small thumbnail strip beneath | ⛔ cfw hero too small |
| Buy-box density | Variant chips + color swatches + qty stepper + "Add to cart" + Wishlist + price + financing strip | Color swatches + price + financing chips + "Out of stock" / CTA | ⛔ cfw is denser; reads as cluttered |
| Below-buy-box | "Try in showroom" → "About this product" + "Dimensions" → "Add a mattress" → "Choose your comfort" → "Reviews" → "You recently viewed" → "You might also like" → "Frequently bought together" | "Tech Specs Detailed Dimensions PDF" link only | ⛔ **8 stacked sections vs 1 link** |
| White space | Tight (sections butt against each other with `mt-10` only) | Generous (each module breathes) | ⛔ |
| Photographic punch | Hero is a third of the page width | Hero dominates the page | ⛔ |

The "plain" complaint here is **not because cfw is empty** — it's because cfw is *over-sectioned*. Stilgar arrives at the PDP, sees a small product photo, scrolls and gets eight modules in a row. That density makes the hero feel small, which reads as "plain hero," and the cross-sell stack reads as "static" (no breathing room, every module looks the same).

### Mobile (375)

cfw: hero stacks above the buy-box, then the same 8 sections one after another → enormous scroll length.
prod: hero stacks above the buy-box, single "Tech Specs" link → done.

### Punch list

- **P1 — cfw-y2i.4**: enlarge the PDP gallery hero. Target ratio: hero takes 7 of 12 cols on md+ (currently ~5 of 12); thumbnail strip moves to a horizontal row beneath the hero. *Files: `src/components/product/PdpGallery.tsx`.*
- **P1 — cfw-y2i.5**: triage the below-buy-box section stack. Of the eight modules, propose collapsing or removing: "Try in showroom" (move to a single inline pill in the buy-box), "You recently viewed" (move to footer-of-page row, dedupe with "You might also like"), "Frequently bought together" (merge into "Add a mattress" UI). Target: 4 modules max above the cross-sell rail. *Files: `src/components/product/PdpInteractive.tsx` and the imports inside it.*
- **P1 — cfw-y2i.6**: increase vertical breathing room between PDP modules. Bump from `mt-10` → `mt-16` between sections; full-width section dividers (`border-t border-cf-divider`). *Files: same PDP layout file.*
- **P2 — cfw-y2i.7**: BNPL widget in cfw shows just text + chevron; prod surfaces an Affirm + Klarna + Afterpay logo strip inline next to the price. The "Sleek + Beautiful" perception is partly the **brand-logo presence** of the financing line. Polish per `docs/design/pdp-polish-specs.md` §2 (already drafted in PR #467) — implementation polecat picks up. (No new bead — covered.)

---

## §3 — Category PLPs (`/shop/futon-frames`, `/shop/mattresses`)

### Desktop (1280)

[cfw futon-frames](visual-parity-audit-2026-05-09/cfw/1280/shop-futon-frames.jpg) · [prod futon-frames](visual-parity-audit-2026-05-09/prod/1280/shop-futon-frames.jpg)

prod's PLP has a header band with category pills ("Front Loading & Nesting · Wall Huggers · Unfinished Wood · Rustic Log") and an empty grid below — it appears the grid renders client-side after a load delay (Wix collection rehydration). cfw renders the grid immediately.

| Aspect | cfw | prod | Verdict |
| --- | --- | --- | --- |
| Server-rendered product grid | Yes (immediate) | No (CSR) | ✅ |
| Sub-category pills | None | "Front Loading & Nesting · Wall Huggers · Unfinished Wood · Rustic Log" | ⛔ cfw missing sub-category structure |
| Card density | 4-up grid, 16+ cards visible without scroll | (empty in capture) | ⚠ |
| Featured / curated row | None — all cards are equivalent | None | ⚠ |

### Punch list

- **P1 — cfw-y2i.8**: add sub-category pills above the PLP grid for futon-frames (Front Loading & Nesting · Wall Huggers · Unfinished Wood · Rustic Log). prod has them; they help shoppers narrow without flipping pages. *Files: `src/app/shop/[category]/page.tsx`, `src/lib/shop/categories.ts` (add `subcategories` field), `src/components/shop/CategoryPills.tsx` (new).*
- **P2 — cfw-y2i.9**: introduce a curated "featured" row at the top of futon-frames + mattresses PLPs (3 hand-picked products with editorial copy). Today every card has equivalent visual weight, which makes the page read flat. *Files: `src/lib/shop/categories.ts`, the PLP page.*

---

## §4 — Cart empty (`/cart` vs `/cart-page`)

[cfw](visual-parity-audit-2026-05-09/cfw/1280/cart-empty.jpg) · [prod](visual-parity-audit-2026-05-09/prod/1280/cart-empty.jpg)

✅ **cfw wins decisively here**. The V3 sleeping-bear illustration (cfw-pm3, just landed) anchors the empty state with mascot warmth; prod is a flat pink gradient with two lines of text. **Preserve as-is.**

⛔ One nit: cookie consent banner overlaps the cfw cart-empty layout's right column. (Same root cause as §1; covered by cfw-y2i.2.)

No new bead. Recommend Stilgar look at this surface specifically — it's a counter-example to the "plain" thread.

---

## §5 — Visit / Contact

[cfw `/visit`](visual-parity-audit-2026-05-09/cfw/1280/visit.jpg) · [prod `/contact`](visual-parity-audit-2026-05-09/prod/1280/visit.jpg)

✅ **cfw wins decisively**. cfw renders: CabinHero illustration → "Visit Us" copy → Location card with full contact + Get Directions CTA → Map iframe → "Ready to shop?" CTA card → Living-night footer. prod renders: a plain contact form with no business info, no map, no hours, no CTA card. cfw is several iterations ahead.

No bead.

---

## §6 — About

[cfw](visual-parity-audit-2026-05-09/cfw/1280/about.jpg) · [prod](visual-parity-audit-2026-05-09/prod/1280/about.jpg)

✅ **cfw wins decisively**. cfw: CabinHero → "About Carolina Futons" → "What we believe" → "Where to find us" → "The team" with mascot avatars → MascotTimeline (years bar with key moments) → "The pieces in this story" with platform-bed photo → footer. prod: hero photo of a bear-on-futon → 2 paragraphs → small footer.

No bead.

---

## §7 — Header / global chrome

The LivingHero band sits at the top of every cfw page (header). It's a stargazing-bear scene that doesn't change context with the page. Initial impressions:

| Impression | Cause | Verdict |
| --- | --- | --- |
| First visit feels rich | LivingHero band at top of `/` | ✅ |
| 3rd visit feels static | Same scene on `/shop/futon-frames`, `/products/<x>`, `/visit`, `/about` | ⛔ |
| 5th visit feels cluttered | LivingHero band + AnnouncementBar + Header nav + sub-nav stripe + breadcrumb on PDP | ⛔ |

Stilgar's "static" comment likely lands here. The feature works for the home page but its reuse on every other surface flattens its impact. **Two ways out:**

1. Show the LivingHero band **only on `/`**. Other pages get a slim header (logo + nav + cart) without the illustrated scene. Saves vertical real estate, lets the page-specific hero (CabinHero on /about and /visit; PDP gallery on PDP) own the top of the fold.
2. Vary the LivingHero band by surface type — keep stargazing on `/`, swap to a daytime shot on PDPs, dawn on cart, etc. More work; preserves brand richness everywhere.

Recommend (1) for v1 — simplest revert path if Stilgar disagrees.

### Punch list

- **P1 — cfw-y2i.10**: gate the LivingHero band to render only on `/`. On all other pages, render the slim header. *Files: `src/components/site/Header.tsx`, `src/app/layout.tsx` or wherever LivingHero is mounted.*
- **P2 — cfw-y2i.11**: AnnouncementBar + LivingHero stack on home consumes 60 + ~480 = 540 px of vertical real estate before content begins. Even if cfw-y2i.10 ships, this stack is heavy on home. Audit AnnouncementBar height (currently 60 px, could go 44) and LivingHero band height (currently 480 px on home; could be 360 with no loss). *Files: `src/components/site/AnnouncementBar.tsx` height class; LivingHero parent height in `src/app/page.tsx`.*

---

## §8 — Color & typography (cross-cutting)

| Aspect | cfw | prod | Verdict |
| --- | --- | --- | --- |
| Heading face | sans-serif (`var(--font-heading)`, Inter-style) | serif (Wix-default with brand logo serif) | ⚠ subjective; cfw is fine but prod feels more "boutique" |
| Body face | system sans | system sans | ⚠ |
| Brand teal (`cf-cta`) | `#3e6b7e` (mountain teal) | similar muted teal in logo | ⚠ |
| Page background | `cf-sand` (#f0f4f8 cool blue-grey) | white-ish | ⚠ cfw is darker but not worse |
| Footer background | `cf-footer-bg` (#1E2A3A — deep navy) with night mascot | white with small logo | ✅ cfw |

### Punch list

- **P2 — cfw-y2i.12**: experiment with a serif heading face on the home + PDP H1 (e.g. Playfair Display, already loaded for testimonial cards). The current sans heading on PDP H1 is part of the "plain" perception — a serif anchor reads more "boutique furniture." Risk: brand consistency vs the existing Inter system. *Files: `src/app/globals.css` (`--font-heading`), Tailwind heading utility.*

---

## Punch list — full ordered list

| Audit ID | Bead | Pri | Surface | Title |
| --- | --- | --- | --- | --- |
| cfw-y2i.1 | **cfw-l93** | P0 | home (mobile) | defer newsletter modal until hero is visible |
| cfw-y2i.2 | **cfw-69w** | P0 | global | reposition cookie consent to bottom-anchored sticky bar |
| cfw-y2i.3 | **cfw-x20** | P1 | home | add photographic anchor to FilterFirst hero (right column md+) |
| cfw-y2i.4 | **cfw-o1g** | P1 | PDP | enlarge gallery hero (7/12 cols on md+) + thumbnails below |
| cfw-y2i.5 | **cfw-mv2** | P1 | PDP | triage 8-section cross-sell stack down to ≤ 4 modules |
| cfw-y2i.6 | **cfw-c5j** | P1 | PDP | bump vertical rhythm `mt-10` → `mt-16` + section dividers (blocked-by cfw-mv2) |
| cfw-y2i.8 | **cfw-dv5** | P1 | PLP | add sub-category pills above futon-frames grid |
| cfw-y2i.10 | **cfw-aul** | P1 | global | gate LivingHero band to `/` only |
| cfw-y2i.9 | **cfw-ee1** | P2 | PLP | curated "featured" row at top of futon-frames + mattresses |
| cfw-y2i.11 | **cfw-3t9** | P2 | global | trim AnnouncementBar + LivingHero combined height (blocked-by cfw-aul) |
| cfw-y2i.12 | **cfw-vfv** | P2 | typography | experiment with serif heading on home + PDP H1 |

(`cfw-y2i.7` is the BNPL polish — already covered by `docs/design/pdp-polish-specs.md` §2; not filed as a new bead.)

**11 actionable items.** 2 × P0, 6 × P1, 3 × P2. Within the 5–15 range the bead asked for.

## What this audit is **not**

- Not a redesign. Every recommendation pulls from existing tokens / components and respects the rebrand work already shipped.
- Not a verdict on cfw vs prod overall — cfw is *clearly ahead* on /about, /visit, /cart-empty, footer, and on having a real product grid. The gaps are concentrated on PDP density, home-mobile occlusion, and the LivingHero repeat.
- Not a final word — Stilgar should walk this doc with the screenshots open, mark up agreement / disagreement on each P0/P1/P2, and we file beads from his greenlit set.

## Open questions for Stilgar

1. **PDP cross-sell triage** (cfw-y2i.5): which two of the eight modules go? Current recommendation: drop "Try in showroom" (move to inline pill), drop "Frequently bought together" (merge into mattress bundle), keep the rest. Want your call before the bead is filed.
2. **LivingHero scope** (cfw-y2i.10): home-only (recommend) vs vary-by-surface (more work, more brand richness)?
3. **Heading face** (cfw-y2i.12): worth the typographic experiment, or is the brand serif a step too far for cfw's modern direction?
4. **Home photographic anchor** (cfw-y2i.3): editorial photo to the right of FilterFirst (recommend) or use one of the existing illustrated heroes (CabinHero / MascotWorldHero)?

## Reproduce

```bash
cd /Users/hal/gt/cfw-y2i   # or any worktree off cfw main with deps installed
node scripts/capture-parity.mjs
# → 48 fresh PNGs in docs/visual-parity-audit-2026-05-09/{cfw,prod}/<vp>/
```

Override origins with `CFW_BASE` / `PROD_BASE` env vars (e.g. point cfw at a specific preview deploy).
