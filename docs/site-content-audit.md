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
| `home.value-props.0.title` | `"Hardwood, not plywood"` | `src/app/page.tsx:224` | All 6 value-prop keys loaded dynamically via `VALUE_PROP_DEFAULTS.map` (cfw-66o.10) |
| `home.value-props.0.body` | `"Frames milled from solid oak, maple, and cherry…"` | `src/app/page.tsx:225` | |
| `home.value-props.1.title` | `"Sleep on it first"` | `src/app/page.tsx:228` | |
| `home.value-props.1.body` | `"Visit the Hendersonville showroom and try every mattress we sell…"` | `src/app/page.tsx:229` | |
| `home.value-props.2.title` | `"White-glove delivery"` | `src/app/page.tsx:232` | |
| `home.value-props.2.body` | `"Regional delivery teams set it up where you want it…"` | `src/app/page.tsx:233` | |
| `about.intro.eyebrow` | `"Our story"` | `src/app/about/page.tsx:83` | All 11 about keys loaded in one `Promise.all` (cf-7pk0 F1, cfw-66o.11) |
| `about.intro.heading` | `"About Carolina Futons"` | `src/app/about/page.tsx:84` | |
| `about.intro.subheading` | `"Family-owned and independently operated in Hendersonville, North Carolina since 1991."` | `src/app/about/page.tsx:85` | |
| `about.intro.lede` | `"Carolina Futons opened its doors in 1991…"` | `src/app/about/page.tsx:86` | |
| `about.beliefs.heading` | `"What we believe"` | `src/app/about/page.tsx:87` | |
| `about.beliefs.body-1` | `"Furniture should be durable, repairable, and honest about what it is…"` | `src/app/about/page.tsx:88` | |
| `about.beliefs.body-2` | `"A futon is a bed that also earns its keep as a sofa…"` | `src/app/about/page.tsx:89` | |
| `about.location.heading` | `"Where to find us"` | `src/app/about/page.tsx:90` | |
| `about.location.body-1` | `"Our showroom is at 824 Locust Street, Suite 200…"` | `src/app/about/page.tsx:91` | |
| `about.team.heading` | `"The team"` | `src/app/about/page.tsx:92` | |
| `about.team.body` | `"A short roster of the people who build, deliver, and stand behind every order…"` | `src/app/about/page.tsx:93` | |
| `contact.eyebrow` | `"Contact"` | `src/app/contact/page.tsx:69` | All 7 contact keys loaded in one `Promise.all` (cf-bbu5) |
| `contact.intro.heading` | `"We'd love to hear from you."` | `src/app/contact/page.tsx:70–73` | |
| `contact.intro.body` | `"Questions about a frame, a mattress, delivery, or a past order?…"` | `src/app/contact/page.tsx:74` | |
| `contact.direct.heading` | `"Reach us directly"` | `src/app/contact/page.tsx:75–78` | |
| `contact.appointment.heading` | `"Schedule a showroom visit"` | `src/app/contact/page.tsx:79–82` | |
| `contact.appointment.body-suffix` | `" Request a slot and we'll confirm by email within one business day."` | `src/app/contact/page.tsx:83–86` | |
| `contact.form.heading` | `"Send a message"` | `src/app/contact/page.tsx:87` | |
| `returns.eyebrow` | `"Policies"` | `src/app/returns/page.tsx` | All 12 returns keys loaded in one `Promise.all` (cfw-5yg) |
| `returns.intro.heading` | `"Returns"` | `src/app/returns/page.tsx` | |
| `returns.intro.body` | `"We stand behind what we sell…"` | `src/app/returns/page.tsx` | |
| `returns.window.heading` | `"The return window"` | `src/app/returns/page.tsx` | |
| `returns.window.body` | `"Most items are returnable within 30 days…"` | `src/app/returns/page.tsx` | |
| `returns.restocking.heading` | `"Restocking and return shipping"` | `src/app/returns/page.tsx` | |
| `returns.restocking.body-1` | `"Frames and accessories incur a 15% restocking fee…"` | `src/app/returns/page.tsx` | |
| `returns.restocking.body-2` | `"You are responsible for return shipping costs…"` | `src/app/returns/page.tsx` | |
| `returns.custom.heading` | `"Custom and made-to-order items"` | `src/app/returns/page.tsx` | Body has embedded JSX links — heading only |
| `returns.damaged.heading` | `"Damaged on arrival"` | `src/app/returns/page.tsx` | Body has embedded JSX links — heading only |
| `returns.faq.heading` | `"Common returns questions"` | `src/app/returns/page.tsx` | FAQ Q&A pairs are structured data — heading only |
| `returns.start.heading` | `"Start a return"` | `src/app/returns/page.tsx` | Body has embedded JSX links — heading only |
| `social.url.facebook` | `"https://www.facebook.com/carolinafutons"` | `src/app/layout.tsx:136` | Key is `social.url.*` — NOT `footer.social.*-href` as proposed in §2f; cfw-66o.7 used the shorter namespace |
| `social.url.instagram` | `"https://www.instagram.com/carolinafutons"` | `src/app/layout.tsx:137` | |
| `social.url.tiktok` | `"https://www.tiktok.com/@carolinafutons"` | `src/app/layout.tsx:138` | |
| `social.url.pinterest` | `"https://www.pinterest.com/carolinafutons"` | `src/app/layout.tsx:139` | |
| `shop.futon-frames.description` | `"Choose from twin, full, or queen hardwood frames…"` | `src/lib/shop/categories.ts:81–85` | cfw-66o.3; template key `shop.${slug}.description` covers all 7 categories |
| `shop.murphy-cabinet-beds.description` | `"Cabinet beds that fold away without hardware in the wall."` | `src/lib/shop/categories.ts:109` | |
| `shop.platform-beds.description` | `"Low-profile solid-wood platform beds."` | `src/lib/shop/categories.ts:116` | |
| `shop.mattresses.description` | `"Futon mattresses and bed mattresses."` | `src/lib/shop/categories.ts:123` | |
| `shop.sofa-beds.description` | `"Convertible sofa beds — seat by day, guest bed by night."` | `src/lib/shop/categories.ts:136` | |
| `shop.sale.description` | `"Discounted futons, beds, and mattresses — while supplies last."` | `src/lib/shop/categories.ts:143` | |
| `shop.mattresses-sale.description` | `"Current mattress promotions."` | `src/lib/shop/categories.ts:153` | |
| `shop.sale.empty-state` | `"No items are on sale right now. Check back soon."` | `src/app/shop/[category]/page.tsx:222` | cfw-66o.6; template key `shop.${slug}.empty-state` |
| `shop.mattresses-sale.empty-state` | `"No mattresses are on sale right now. Check back soon."` | `src/app/shop/[category]/page.tsx:222` | |
| `shop.futon-frames.subtitle` | `"Solid hardwood"` | `src/app/shop/page.tsx:58` | cfw-66o.4 |
| `shop.murphy-cabinet-beds.subtitle` | `"Space-saving"` | `src/app/shop/page.tsx:59` | |
| `shop.platform-beds.subtitle` | `"Low & modern"` | `src/app/shop/page.tsx:60` | |
| `shop.mattresses.subtitle` | `"Made in USA"` | `src/app/shop/page.tsx:61` | |
| `shop.mattresses-sale.subtitle` | `"On sale now"` | `src/app/shop/page.tsx:62` | |
| `shop.index.subhead` | `"Pick a category to browse."` | `src/app/shop/page.tsx:55` | cfw-66o.4 |
| `shop.shop-the-room.eyebrow` | `"Shop the room"` | `src/app/shop/page.tsx:56` | |
| `shop.shop-the-room.heading` | `"Or jump straight in"` | `src/app/shop/page.tsx:57` | |
| `shop.futon-frames.featured.eyebrow` | `"Editor's picks"` | `src/lib/shop/categories.ts:96` | cfw-66o.5; template key `shop.${slug}.featured.*` |
| `shop.futon-frames.featured.heading` | `"Where most people start"` | `src/lib/shop/categories.ts:97` | |
| `shop.futon-frames.featured.body` | `"Three frames that cover the common questions…"` | `src/lib/shop/categories.ts:98–101` | |
| `guides.index.eyebrow` | `"Buying guides"` | `src/app/guides/page.tsx:54` | cfw-mr7 |
| `guides.index.heading` | `"Figure out what you actually need"` | `src/app/guides/page.tsx:57` | |
| `guides.index.subhead` | `"35 years of answering the same questions at the showroom…"` | `src/app/guides/page.tsx:60` | |

---

## 2. Previously hardcoded — now wired (historical reference)

All items in §2 have been wired to `getSiteContent()` and are now in §1 above. This section is preserved for implementation notes and context.

### 2a. Category descriptions — **LIVE** (cfw-66o.3)

Wired in `[category]/page.tsx` via template key `shop.${categorySlug}.description`. The `categories.ts` `as const` values serve as fallbacks.

---

### 2b. Category empty-state copy — **LIVE** (cfw-66o.6)

Wired in `[category]/page.tsx` via template key `shop.${categorySlug}.empty-state`.

### 2c. Category card subtitles — **LIVE** (cfw-66o.4)

Wired in `src/app/shop/page.tsx` via explicit keys per slug.

### 2d. Shop index page copy — **LIVE** (cfw-66o.4)

Wired in `src/app/shop/page.tsx`.

### 2e. Futon frames featured-row copy — **LIVE** (cfw-66o.5)

Wired in `[category]/page.tsx` via template key `shop.${categorySlug}.featured.*`.

### 2f. Social media URLs — **LIVE** (cfw-66o.7)

**Note:** Implemented as `social.url.*` (not `footer.social.*-href` as originally proposed). The live keys are `social.url.facebook`, `social.url.instagram`, `social.url.tiktok`, `social.url.pinterest` — see §1 above.

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
- `social.url.facebook` ✅

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
