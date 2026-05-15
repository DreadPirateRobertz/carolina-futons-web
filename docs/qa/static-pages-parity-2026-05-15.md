# cf-7pk0 — Static pages parity audit vs Wix

**Bead:** cf-7pk0 (P1, cf-3qt.6 child)
**Auditor:** miquella
**Date:** 2026-05-15
**Scope:** `/about`, `/contact`, `/visit` cfw pages vs Wix Studio originals
**Convoy:** hq-cv-6fmgo
**Companion audits:** cf-yu2l (promo pages parity, 2026-05-15)

## TL;DR

**3 pages, 1 page clean, 2 with the SAME parity gap.**

| Page | cfw status | Parity verdict |
|---|---|---|
| `/about` | rich content, hardcoded copy | ⚠️ **GAP F1**: copy not wired to SiteContent — editor cannot update without deploy |
| `/contact` | rich content, hardcoded copy + **drift risk** | ⚠️ **GAP F2**: copy not wired to SiteContent + showroom hours hardcoded out-of-sync with `/visit`'s SiteContent-driven hours |
| `/visit` | gold-standard architecture | ✅ **PARITY OK** — 10 SiteContent keys + LocalBusinessSchema + CabinHero |

**Visual parity context** (per `docs/visual-parity-audit-2026-05-09.md`):

> "cfw wins decisively. cfw renders: CabinHero illustration → 'Visit Us' copy → Location card → Map iframe → CTA card. prod renders: a plain contact form with no business info, no map, no hours, no CTA card. cfw is several iterations ahead."

So cf-7pk0 is **not** about matching Wix's visual surface (cfw is already richer). It's about matching the **editor-managed-content architecture** that `/visit` already exemplifies — so a future Brenda hour-change or copy tweak doesn't require a deploy + PR review + CI cycle.

## Methodology

1. cfw page source inspection for the 3 pages
2. Cross-reference against `/visit`'s SiteContent pattern (the architectural gold standard already shipped via cf-h21g + cfw-22e)
3. Cross-reference against `docs/visual-parity-audit-2026-05-09.md` for prod-vs-cfw delta context
4. Static analysis only — Playwright MCP disconnected this session; recommend Stilgar manual visual pass before cf-3qt.6 parallel-run sign-off

## F1 — HIGH parity gap: `/about` copy hardcoded, not editor-managed

**Where:** `src/app/about/page.tsx`

**Findings:**
- 4 sections of hardcoded prose (intro, "What we believe", "Where to find us", "The team") — **0 calls to `getSiteContent`**
- 1 hardcoded `ABOUT_DESCRIPTION` constant at line 15 (used for both `<meta description>` and visible body copy at line 50)
- Phone, email, address are template-substituted from `BUSINESS` constant (correct — that's a single source of truth in `@/lib/business/contact-info`)
- `MascotWorldHero`, `MascotTimeline`, `ShopTheRoom` illustrations are SVG components, not editor-editable (acceptable — same pattern as `/visit`'s `CabinHero`)

**Risk:** Brenda cannot update the "What we believe" or "Where to find us" copy without a code change + PR. Seasonal updates (e.g., "Closed for renovations through October") have to be PR'd. This contradicts the cf-3qt mandate to give marketing editor-managed content surfaces.

**Recommended fix** (mirrors `/visit`'s cfw-22e pattern):

```tsx
const ABOUT_COPY_FALLBACKS = {
  introHeading: "About Carolina Futons",
  introEyebrow: "Our story",
  introBody: "Family-owned and independently operated in Hendersonville, North Carolina since {{foundedYear}}.",
  beliefsHeading: "What we believe",
  beliefsBody1: "Furniture should be durable, repairable, ...",
  beliefsBody2: "A futon is a bed that also earns its keep ...",
  locationHeading: "Where to find us",
  locationBody1: "Our showroom is at {{address}}. Stop in to sit on the frames, ...",
  locationBody2: "Prefer to talk first? Call {{phone}} or email {{email}}.",
  teamHeading: "The team",
  teamBody: "A short roster of the people who build, deliver, ...",
} as const;

// Server-component fetch (await Promise.all on N getSiteContent calls)
```

Scope: ~30 LOC additions (10 SiteContent keys + Promise.all + JSX substitutions). Single PR.

## F2 — HIGH parity gap: `/contact` hardcoded copy + drift risk vs `/visit`

**Where:** `src/app/contact/page.tsx`

**Findings:**
- Hardcoded prose: intro heading "We'd love to hear from you.", body, section headings ("Reach us directly", "Schedule a showroom visit", "Send a message")
- Hardcoded labels for the contact channels ("Phone", "Email", "Visit")
- **DRIFT RISK** — Line 97-98:

  ```tsx
  Open Wednesday through Saturday, 10 am–5 pm. Request a slot...
  ```

  This hardcodes the same showroom hours that `/visit` reads from `visit.hours.wed-sat` via SiteContent. If Brenda updates hours via the Wix editor (e.g., for a holiday closure), `/visit` reflects it instantly but `/contact` keeps showing the old hours. Two surfaces, one source of truth — currently divergent.

**Risk:** Compounding the F1 editor-cannot-update concern with a real drift bug. The drift will happen the first time Brenda changes hours and forgets `/contact` exists.

**Recommended fix:**

1. Wire `/contact` to SiteContent (same pattern as F1 above):
   - `contact.intro.heading`, `contact.intro.body`, `contact.direct.heading`, `contact.appointment.heading`, `contact.appointment.body`, `contact.send.heading`
2. **Eliminate the drift** — `/contact`'s "Wednesday through Saturday, 10 am–5 pm" sub-copy must read from the same `visit.hours.wed-sat` SiteContent key that `/visit` uses. OR: extract showroom hours into a shared `ShowroomHoursLabel` component that both `/visit` and `/contact` import. The component owns the SiteContent fetch.

Scope: ~25 LOC + shared hours component (or ~35 LOC if duplicating the fetch logic). Single PR alongside F1, or two small PRs.

## ✅ `/visit` — gold standard (no action needed)

**Where:** `src/app/visit/page.tsx`

**Already correctly wired:**
- 10 `getSiteContent` calls in a single `Promise.all` for: intro heading + body, location heading, hours heading, hours sun-tue + wed-sat, directions button label, CTA heading + body + button label
- `LocalBusinessSchema` JsonLd
- `CabinHero` illustration
- Map iframe + tap-to-call/email
- Fallbacks documented in `VISIT_COPY_FALLBACKS` + `STORE_HOURS_FALLBACK` arrays

**Visual richness** (per visual-parity-audit-2026-05-09): "cfw renders Location card → Map iframe → CTA card. prod renders a plain contact form. cfw is several iterations ahead."

This is the architectural pattern F1 + F2 should match.

## Pre-cutover acceptance status

Per cf-3qt.6 parallel-run + parity audit acceptance:

- [ ] `/about` parity — ⚠️ GAP, copy hardcoded; needs SiteContent wiring (~30 LOC)
- [ ] `/contact` parity — ⚠️ GAP, copy hardcoded + drift risk on hours; needs SiteContent wiring + shared-hours component (~25-35 LOC)
- [x] `/visit` parity — ✅ OK, gold-standard SiteContent + JsonLd pattern

## Recommended phasing

Per cf-ukc6 batch-window discipline:

**Phase 1 (now, this audit)**: doc the gap, no code change. ✓ (this commit)

**Phase 2 (after batch window opens, ~2 days)**: ship 1 PR per page or 1 combined PR:
- F1 `/about` → SiteContent wiring + 10-key fallback table
- F2 `/contact` → SiteContent wiring + eliminate hours drift (shared `ShowroomHoursLabel` component reading `visit.hours.wed-sat`)

TDD scope: unit tests mocking `getSiteContent` to assert (a) each key is read with the documented fallback, (b) Wix-outage path returns the fallback prose, (c) shared-hours component reads the canonical SiteContent key.

## Out of scope (file separately if needed)

- `/faq`, `/privacy`, `/terms`, `/accessibility` — other static pages not covered by this bead. Likely have the same hardcoded-copy pattern. Separate audit.
- `/press` — has its own data layer (per cf-3qt URL-CMS-MAP `Landings` collection); covered indirectly by the blaidd-seed gap I flagged in cf-yu2l F1.
- `/about` team-roster CMS source — the placeholder copy "A short roster ... is coming soon" suggests a future TeamMembers collection. Out of cf-7pk0 scope.

## References

- `docs/visual-parity-audit-2026-05-09.md` — Stilgar's "cfw vs prod" sweep, page-by-page verdicts
- `src/app/visit/page.tsx` — gold-standard SiteContent pattern (cf-h21g + cfw-22e)
- `src/lib/cms/site-content.ts` — `getSiteContent(key, fallback)` reader contract
- Companion: `docs/qa/promo-pages-parity-2026-05-15.md` (cf-yu2l, same architectural framing)
