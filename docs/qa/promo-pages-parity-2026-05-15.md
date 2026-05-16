# cf-yu2l — Promo pages parity audit vs Wix

**Bead:** cf-yu2l (P1, cf-3qt.6 child)
**Auditor:** miquella
**Date:** 2026-05-15
**Scope:** `/spring-sale`, `/gift-cards`, `/referral` cfw pages vs Wix Studio originals
**Convoy:** hq-cv-jctmm

## TL;DR

**2 real parity gaps, 1 page clean, 1 pre-existing-known-blocker.**

| Page | cfw status | Wix-parity verdict |
|---|---|---|
| `/spring-sale` | **wired to Landings** (cf-yu2l.F1 PR #662) | ✅ **F1 SHIPPED**: `getLandingBySlug("spring-sale")` reads 6 body fields + 2 SEO fields with per-field fallback. Render byte-identical until blaidd seeds the `Landings` row; post-seed auto-picks up editor data. See **F1 ship reconciliation** addendum below. |
| `/gift-cards` | amount-only picker | ⚠️ **GAP F2**: Wix `@wix/gift-cards` SDK supports recipient email + personal message + scheduled send; cfw treats gift cards as a plain cart line item. |
| `/referral` | dashboard + share | ✅ **PARITY OK** (with minor follow-on questions). Code + share URL + stats present. |

## Methodology

Without Playwright MCP (disconnected this session) I cannot live-browse the Wix Studio originals at `chrisdealglass.wixstudio.com/my-site` to do pixel/feature diff. The audit relies on:

1. cfw page source inspection (`src/app/{spring-sale,gift-cards,referral}/page.tsx` + their dependent components)
2. Cross-reference against the cf-3qt epic's URL-CMS-MAP (`docs/cf-3qt/URL-CMS-MAP.md` in cfutons) which documents the Wix-side data layer for each route
3. Cross-reference against CMS-COLLECTION-AUDIT (`docs/cf-3qt/CMS-COLLECTION-AUDIT.md`) for unresolved seed dependencies
4. Wix SDK feature surface (gift-cards / loyalty) as standard contract reference

A follow-on **manual** browser parity check by Stilgar against the live Wix preview is recommended before the cf-3qt.6 parallel-run sign-off — that's where pixel-level fidelity gets verified.

---

## F1 — HIGH parity gap: `/spring-sale` hero copy is hardcoded, not editor-managed

**Where:** `src/app/spring-sale/page.tsx:67-77`

```tsx
<h1 id="spring-sale-hero" className="...">
  Spring Sale on mattresses
</h1>
<p className="...">
  Hendersonville, NC. American-made mattresses we actually sleep on,
  picked for the season and priced to move. Free local delivery on
  orders over $1,500.
</p>
```

**Wix-side contract** (`docs/cf-3qt/URL-CMS-MAP.md`):

> `/spring-sale` → `@wix/data → Landings (filter slug="spring-sale")` + `@wix/stores` sale collection

The Wix page reads hero copy + image from a `Landings` CMS collection so marketing can edit promos without a deploy. cfw bypasses the data layer and ships static copy baked into the component.

**Helper already exists** for reading the collection:
- `src/lib/wix/cf3qt.ts` — `getLandingBySlug(slug)` (exported wrapper around `getCollectionItemBySlug`)

**Blocker:** Per `docs/cf-3qt/CMS-COLLECTION-AUDIT.md`:
> `Landings` (`spring-sale` row) — blocks `/spring-sale`. Pull hero copy + image from current Wix Studio Sale page (radahn has it) → seed script. **Phase 5 impl**, blaidd seeds.

The Landings collection is missing in Wix Headless. Until blaidd seeds it, cfw can't read what isn't there. The current hardcoded copy is a **snapshot** of the Wix copy at migration time — acceptable as a placeholder, but the page should be re-wired to read from `getLandingBySlug("spring-sale")` once seeded, falling back to the hardcoded literals on outage (mirroring the `result.error` pattern at line 43 of the same file).

**Recommended fix (post-seed):**
```tsx
import { getLandingBySlug } from "@/lib/wix/cf3qt";
const landing = await getLandingBySlug("spring-sale");
const heroTitle = landing?.headline ?? "Spring Sale on mattresses";
const heroBody = landing?.subheadline ?? /* current hardcoded literal */;
const heroImageUrl = landing?.heroImageUrl;
```

**Impact:** Marketing can't change promo copy without a cfw redeploy. Pre-cutover this means every seasonal promo update is a code change + PR + Vercel build. Post-cutover this becomes the editor-vs-engineering bottleneck cf-3qt was meant to remove.

## F2 — MEDIUM parity gap: `/gift-cards` missing recipient-personalization features

**Where:** `src/components/gift-cards/GiftCardPicker.tsx:60-145`

cfw flow: Select amount → "Add $N gift card to cart" → standard checkout → user receives gift card themselves → presumably forwards manually.

**Standard Wix Stores gift card features** (via `@wix/gift-cards` SDK):
- Recipient email (so gift card delivers directly to the recipient)
- Recipient name
- Sender name
- Personal message
- Scheduled send date

None of these are surfaced in the cfw `GiftCardPicker`. The footer copy at line 142 says *"Gift cards are delivered digitally and can be applied at checkout"* — accurate for the buyer's own purchase, but doesn't reflect a gifting flow at all.

**Recommended fix:**
Add a "Sending this as a gift?" expand panel to GiftCardPicker with:
- Recipient email (required if expand panel is open)
- Recipient name
- Sender name (default to logged-in member's name)
- Personal message (textarea, ~200 char limit)
- Scheduled delivery date (optional)

Wix's gift-card webMethod will need a matching backend endpoint (`createGiftCardOrder` or similar) — current `addItemAction` doesn't carry recipient metadata. Likely a 2-PR scope: backend webMethod + frontend GiftCardPicker rework.

**Impact:** Customers buying gift cards as actual gifts (the common case for gift-cards traffic) have a degraded experience vs the Wix version. Cart conversion may drop because the personalization step doesn't exist.

**Scope question:** This may be an intentional MVP simplification carried forward through cf-3qt phases. If so, **flag it as a known Phase-9 deferred item** in the retirement checklist (`docs/cf-3qt-9-wix-retirement-checklist.md`) so the gap is visible before Wix retirement makes it un-fixable via the Wix editor.

## ✅ `/referral` — parity OK (with minor questions)

**Where:** `src/app/referral/page.tsx` + `src/components/referral/ReferralDashboard.tsx`

cfw behavior:
- Member-only (redirects unauthenticated users to `/account?next=/referral`)
- Reads `getMyReferralCodeAction` + `getMyReferralStatsAction` server actions
- Renders code, share URL, copy/share-sheet buttons (navigator.share with clipboard fallback), 3-stat dashboard (total referrals, pending rewards, earned rewards)
- `/referral/share/[code]` subpage exists (recipient landing — out of scope for this audit, would benefit from its own pass)

**Wix-side contract** (`docs/cf-3qt/URL-CMS-MAP.md`):
> `/loyalty`, `/referral`, `/rewards` → `@wix/loyalty` + `loyaltyService` webMethods

The cfw build covers the core referral flow. Minor questions that would benefit from a manual parity check:

1. Does the Wix version show a **redemption history** (past rewards earned/spent)? cfw ReferralDashboard only shows current `pendingRewards` + `earnedRewards` aggregates — no per-referral history list.
2. Does the Wix version show a **referred friends list** (names/dates of who you referred)? cfw shows aggregate totalReferrals count only.
3. Loyalty-tier integration (Bronze/Silver/Gold etc.) — `@wix/loyalty` typically exposes tiers; cfw `/referral` doesn't surface a tier. (`/loyalty` and `/rewards` are separate routes — out of scope for this audit.)

If any of 1-3 are present on the Wix version, the cfw page is a feature regression. Recommend a manual Stilgar check against the live Wix `/account/my-account/referral-page` (or wherever loyalty.referral lives in the Wix Editor).

---

## Pre-cutover acceptance status

Per cf-3qt.6 parallel-run + parity audit acceptance:

- [x] `/spring-sale` parity — ✅ **F1 SHIPPED** via cf-yu2l.F1 PR #662 (`getLandingBySlug` wired; per-field fallback). Editor still needs Landings row seeded by blaidd to actually edit copy, but cfw side is parity-ready. See "F1 ship reconciliation" below.
- [x] `/gift-cards` parity — ✅ CLOSED by **cf-gift-g1 PR #589** (merged 2026-05-15). Adds "Send as a gift" toggle revealing recipient email + recipient name + sender name + personal message + scheduled delivery; fields ride along as Wix line-item `customTextFields`. Default-off path is byte-identical to pre-cf-gift-g1 payload (single-click self-buy preserved). TDD pin: `src/__tests__/cart-customTextFields.test.ts` (5 cases).
- [x] `/referral` parity — ✅ OK at core flow. 3 minor questions pending Stilgar visual check.

### Addendum 2026-05-15 (post-cf-gift-g1 reconciliation)

The F2 gap this audit identified shipped within hours of filing — cf-gift-g1 PR #589 (merged 17:48 MT) implemented exactly the recommended scope (the 5 customTextFields + the "Send as a gift" expand panel). The 2-PR scope estimate in F2 collapsed to 1 PR because Wix's line-item `customTextFields` slot absorbed the recipient-meta carry without needing a new backend webMethod — the data rides existing `addItemAction`.

Remaining cf-yu2l surface:
- **F1** still blaidd-blocked on the `Landings` Wix-Data seed. Re-poll after CMS-COLLECTION-AUDIT seed phase completes.
- **/referral** Stilgar visual-check items 1-3 still pending — file as a P3 follow-on bead if any of redemption-history / referred-friends-list / loyalty-tier-surface are present on the live Wix page.

Recommend transitioning cf-yu2l to **blocked-on-blaidd** until Landings seed lands, then reopening for F1 wiring against `getLandingBySlug("spring-sale")` from `@/lib/wix/cf3qt`.

### Addendum 2026-05-15 (F1 ship reconciliation — supersedes F1-blaidd-blocked status above)

F1 was implemented by **cf-yu2l.F1 PR #662** (2-commit stack: a6fe20a body wiring + 230dda9 generateMetadata + c22b1f0 self-CR fold). 22/22 tests green. The page now reads:
- `headline`, `subheadline`
- `ctaPrimaryLabel`, `ctaPrimaryHref`
- `ctaSecondaryLabel`, `ctaSecondaryHref`
- `seoDescription`, `ogImageUrl` (metadata)

…from the `Landings` collection via `getLandingBySlug("spring-sale")`, with `coalesce(value, fallback)` helper rejecting empty strings + null/undefined, `React.cache` deduping the dual generateMetadata-vs-page-body fetch, and `LANDING_OG_DIMENSIONS = {width: 1200, height: 630}` for crawler pre-sizing parity.

The 6-field body + 2-field metadata wiring is byte-identical to the original hardcoded literals until blaidd seeds the Landings row, then auto-picks up editor data without a cfw deploy. **Wire is live; seed is still blaidd-blocked.**

`/referral` minor questions (redemption history, referred-friends list, loyalty-tier surface) still pending Stilgar visual check.

## Out of scope (file separately)

- `/loyalty` and `/rewards` routes (sibling to `/referral`, separate URL-CMS-MAP entries) — separate parity audit if not yet done
- Pixel-level visual parity (banner image, button styling, color palette) — Playwright/visual-regression follow-on
- `/referral/share/[code]` recipient landing page — separate audit
- Backend webMethod parity for gift-card / loyalty / referral data shape — covered by cf-3qt.6 in_progress

## References

- `docs/cf-3qt/URL-CMS-MAP.md` (cfutons) — Wix data layer per route
- `docs/cf-3qt/CMS-COLLECTION-AUDIT.md` (cfutons) — unresolved seed dependencies, `Landings` blocker
- `src/lib/wix/cf3qt.ts` (cfw) — `getLandingBySlug` exported helper, ready for F1 wiring (fields: `headline`, `subheadline`, `heroImageUrl`)
- `docs/cf-3qt-9-wix-retirement-checklist.md` (cfutons) — Phase 9 retirement gate
- Parent epic: cf-3qt.6 (parallel run + parity audit)
