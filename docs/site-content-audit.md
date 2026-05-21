# cfw Site Content Audit — Hardcoded Copy → SiteContent Keys

**Bead:** cfw-66o.1 (cfw-66o.A) — updated post-cfw-66o.3/.4/.5/.6/.7 merges  
**Author:** morgott · 2026-05-21  
**Audience:** Brenda, Stilgar, PM (melania), implementing engineers  
**Epic:** cfw-66o — Owner-friendly admin UI (Brenda edits content without a deploy)

This document maps every hardcoded owner-editable string in the cfw frontend to a proposed `SiteContent` key. It is the prerequisite input for cfw-66o subtasks that wire each group to `getSiteContent()`.

---

## How to read this table

| Column | Meaning |
|---|---|
| **Key** | Proposed `SiteContent` key (follows `SITE_CONTENT_KEY_PATTERN`: lowercase, hyphenated, ≥ 2 dot-separated segments) |
| **Current value** | Exact hardcoded string in the source today |
| **File : line** | Source location — click to jump |
| **Status** | `LIVE` = already wired to `getSiteContent()`; `HARDCODED` = proposed but not yet wired |
| **Priority** | `P1` = visible marketing copy Brenda is likely to edit; `P2` = functional copy that changes occasionally; `P3` = structural / low-edit-frequency |

---

## 1. Already live — keys wired to `getSiteContent()`

These are **complete** and require no further work. Included for reference and to confirm coverage.

| Key | Current fallback value | File : line | Notes |
|---|---|---|---|
| `footer.tagline` | `"Quality futons since 1991"` | `Footer.tsx:116` | Threaded via `layout.tsx:116` |
| `footer.showroom-hours.label` | `"Showroom hours: Sun–Tue, 10am–5pm"` | `Footer.tsx:117` | Threaded via `layout.tsx:120–125` |
| `footer.copyright-line` | `"© {year} Carolina Futons. Hendersonville, NC."` | `Footer.tsx:118` | `{year}` substituted at render; threaded via `layout.tsx:127–133` |
| `announcement.rotation.0.message` | `"Free white-glove delivery on orders over $1,500"` | `announcement-defaults.ts:37` | Derived from `FREE_DELIVERY_THRESHOLD_CENTS` — updates automatically if threshold changes |
| `announcement.rotation.1.message` | `"10-year warranty on all hardwood futon frames"` | `announcement-defaults.ts:58` | |
| `announcement.rotation.2.message` | `"Family-owned since 1991 · Hendersonville, NC"` | `announcement-defaults.ts:59` | |
| `announcement.rotation.3.message` | `"Free fabric swatches — find your perfect match"` | `announcement-defaults.ts:60` | Paired with CTA below |
| `announcement.rotation.3.cta-label` | `"Order free swatches"` | `announcement-defaults.ts:67` | |
| `announcement.rotation.3.cta-href` | `"/swatch-request"` | `announcement-defaults.ts:67` | |
| `announcement.rotation.4.message` | `"Assembly included with every delivery"` | `announcement-defaults.ts:61` | |
| `home.filter-first.eyebrow` | `"Family owned · Hendersonville, NC"` | `filter-first-content.ts:16` | All three hero strings loaded by `loadFilterFirstHeroCopy()` |
| `home.filter-first.headline` | `"Find your perfect futon"` | `filter-first-content.ts:17` | |
| `home.filter-first.subhead` | `"Choose from our selection of high-quality futon frames…"` | `filter-first-content.ts:18–21` | |
| `visit.intro.heading` | `"Visit Us"` | `visit/page.tsx:57` | |
| `visit.intro.body` | `"Come try it in person. Our Hendersonville showroom…"` | `visit/page.tsx:58–59` | |
| `visit.location.heading` | `"Location"` | `visit/page.tsx:60` | |
| `visit.hours.heading` | `"Store Hours"` | `visit/page.tsx:61` | |
| `visit.hours.sun-tue` | `"10 am – 5 pm"` | `visit/page.tsx:43` | Hours are the key seasonal-edit point |
| `visit.hours.wed-sat` | `"Closed"` | `visit/page.tsx:47` | |
| `visit.directions-button.label` | `"Get directions"` | `visit/page.tsx:62` | |
| `visit.cta.heading` | `"Ready to shop?"` | `visit/page.tsx:63` | |
| `visit.cta.body` | `"Browse online first, then come in and try everything."` | `visit/page.tsx:64` | |
| `visit.cta.button-label` | `"Browse all products"` | `visit/page.tsx:65` | |
| `shop.sale.empty-state` | `"No items are on sale right now. Check back soon."` | `shop/[category]/page.tsx:215` | cfw-66o.6 (#899) — resolved at render; `categories.ts` value is fallback |
| `shop.mattresses-sale.empty-state` | `"No mattresses are on sale right now. Check back soon."` | `shop/[category]/page.tsx:215` | cfw-66o.6 (#899) |
| `shop.index.subhead` | `"Pick a category to browse."` | `shop/page.tsx:55` | cfw-66o.4 (#902) |
| `shop.shop-the-room.eyebrow` | `"Shop the room"` | `shop/page.tsx:56` | cfw-66o.4 (#902) |
| `shop.shop-the-room.heading` | `"Or jump straight in"` | `shop/page.tsx:57` | cfw-66o.4 (#902) |
| `shop.futon-frames.subtitle` | `"Solid hardwood"` | `shop/page.tsx:58` | cfw-66o.4 (#902) |
| `shop.murphy-cabinet-beds.subtitle` | `"Space-saving"` | `shop/page.tsx:59` | cfw-66o.4 (#902) |
| `shop.platform-beds.subtitle` | `"Low & modern"` | `shop/page.tsx:60` | cfw-66o.4 (#902) |
| `shop.mattresses.subtitle` | `"Made in USA"` | `shop/page.tsx:61` | cfw-66o.4 (#902) |
| `shop.mattresses-sale.subtitle` | `"On sale now"` | `shop/page.tsx:62` | cfw-66o.4 (#902) |
| `shop.futon-frames.featured.eyebrow` | `"Editor's picks"` | `shop/[category]/page.tsx:203` | cfw-66o.5 (#900) — template key `shop.${slug}.featured.*` |
| `shop.futon-frames.featured.heading` | `"Where most people start"` | `shop/[category]/page.tsx:204` | cfw-66o.5 (#900) |
| `shop.futon-frames.featured.body` | `"Three frames that cover the common questions…"` | `shop/[category]/page.tsx:205` | cfw-66o.5 (#900) |
| `social.url.facebook` | `"https://www.facebook.com/carolinafutons"` | `layout.tsx:136` | cfw-66o.7 (#904) — key renamed from audit's `footer.social.facebook-href` |
| `social.url.instagram` | `"https://www.instagram.com/carolinafutons"` | `layout.tsx:137` | cfw-66o.7 (#904) |
| `social.url.tiktok` | `"https://www.tiktok.com/@carolinafutons"` | `layout.tsx:138` | cfw-66o.7 (#904) |
| `social.url.pinterest` | `"https://www.pinterest.com/carolinafutons"` | `layout.tsx:139` | cfw-66o.7 (#904) |
| `shop.futon-frames.description` | `"Choose from twin, full, or queen hardwood frames…"` | `shop/[category]/page.tsx` | cfw-66o.3 (#896) — template key `shop.${slug}.description`; `categories.ts` value is fallback |
| `shop.murphy-cabinet-beds.description` | `"Cabinet beds that fold away without hardware in the wall."` | `shop/[category]/page.tsx` | cfw-66o.3 (#896) |
| `shop.platform-beds.description` | `"Low-profile solid-wood platform beds."` | `shop/[category]/page.tsx` | cfw-66o.3 (#896) |
| `shop.mattresses.description` | `"Futon mattresses and bed mattresses."` | `shop/[category]/page.tsx` | cfw-66o.3 (#896) |
| `shop.sofa-beds.description` | `"Convertible sofa beds — seat by day, guest bed by night."` | `shop/[category]/page.tsx` | cfw-66o.3 (#896) |
| `shop.sale.description` | `"Discounted futons, beds, and mattresses — while supplies last."` | `shop/[category]/page.tsx` | cfw-66o.3 (#896) |
| `shop.mattresses-sale.description` | `"Current mattress promotions."` | `shop/[category]/page.tsx` | cfw-66o.3 (#896) |

---

## 2. Hardcoded copy — remaining (not yet wired)

All identified P1/P2/P3 groups have been wired to `getSiteContent()` as of cfw-66o.3 (#896). No remaining HARDCODED rows.

---

## 3. Excluded — not owner-editable

These strings are hardcoded but intentionally excluded from SiteContent because they are structural/system-level copy.

| String | File | Reason excluded |
|---|---|---|
| `PRIMARY_NAV` labels ("Futon Frames", "Murphy Beds", etc.) | `HeaderMobileMenu.tsx:19–24` | Structural navigation — tied to routes; changing a label requires a route rename (code change) |
| `SUB_NAV` labels ("Design a Room", "Guides", etc.) | `HeaderMobileMenu.tsx:26–34` | Same — structural navigation |
| `FOOTER_COLUMNS` nav labels ("Shop", "Info") and link labels | `Footer.tsx:59–82` | Structural navigation |
| `"We're having trouble loading products right now…"` | `shop/[category]/page.tsx:328–331` | System error state — not marketing copy |
| `"No more products on page {N}. Back to page 1"` | `shop/[category]/page.tsx:335–338` | Pagination navigation — not marketing copy |
| `"No products match these filters. Try adjusting…"` | `shop/[category]/page.tsx:346` | Filter feedback — functional, not owner-editable |
| `"No products found in this collection yet."` | `shop/[category]/page.tsx:344` | Fallback for unconfigured collections — not marketing copy |
| `"Call/Text: "` / `"Email: "` inline labels | `visit/page.tsx:138, 147` | UI chrome labels — very stable, deploy-edit acceptable |
| `BUSINESS` constant (address, phone, email) | `contact-info.ts` | Already centralized as single source; deploy-edit is appropriate — these rarely change and a wrong address would be a P0 requiring immediate deploy anyway |
| `"Carolina Futons"` brand name (various) | Multiple | Static brand identity — never changes |

---

## 4. Key naming conventions

All proposed keys follow `SITE_CONTENT_KEY_PATTERN` enforced by `cfw-6qd.12`:
- Lowercase + hyphenated within each segment
- Minimum 2 dot-separated segments
- Segment 1: surface (`shop`, `footer`, `announcement`, `home`, `visit`, `social`)
- Segment 2: component or slug (`futon-frames`, `index`, `shop-the-room`, etc.)
- Segment 3+: field within that component (`description`, `subtitle`, `eyebrow`, etc.)

Examples:
- `shop.futon-frames.description` ✅
- `shop.sale.empty-state` ✅
- `footer.social.facebook-href` ✅

---

## 5. Implementation status

| Priority | Group | Keys | Status |
|---|---|---|---|
| P1 | Category descriptions | 7 keys (§2a) | ✅ **DONE** — cfw-66o.3 PR #896 |
| P1 | Sale empty-state | 2 keys (§2b) | ✅ **DONE** — cfw-66o.6 PR #899 |
| P2 | Shop index subhead + ShopTheRoom labels | 3 keys (§2d) | ✅ **DONE** — cfw-66o.4 PR #902 |
| P2 | Category card subtitles | 5 keys (§2c) | ✅ **DONE** — cfw-66o.4 PR #902 |
| P2 | Futon frames featured-row copy | 3 keys (§2e) | ✅ **DONE** — cfw-66o.5 PR #900 |
| P3 | Social URLs | 4 keys (§2f) | ✅ **DONE** — cfw-66o.7 PR #904 (keys renamed to `social.url.*`) |

---

## Refs

- cfw-66o (epic — owner-friendly admin UI)
- cfw-6qd.12 (SITE_CONTENT_KEY_PATTERN enforcement)
- `src/lib/cms/site-content.ts` — `getSiteContent(key, fallback)` implementation
- `src/lib/cms/filter-first-content.ts` — example of a good loader pattern to replicate
- `src/app/visit/page.tsx` — example of fully-migrated page (all copy via getSiteContent)
