# cf-d41j — Member pages parity audit (cf-3qt.6, 2026-05-15)

**Bead:** cf-d41j (P1) — cf-3qt.6 Member pages parity — audit account+dashboard Next.js vs Wix
**Author:** crew/opal (cfutons_web)
**Origins audited:**
- **cfw**: `carolina-futons-web` main @ `119cf94` — `src/app/account/*` + `src/app/(member)/dashboard/*`
- **prod (Wix Studio)**: `https://www.carolinafutons.com` — Wix Members area defaults + CF+ Membership configuration

**Method:** static read of cfw source, cross-reference against cf-3qt Phase 3 scope, compare against Wix Members built-in feature set + carolina-futons specific membership configuration as documented in Velo `managePushPreferences` + member-points webMethods. **No prod-Wix login session available from this sandbox**, so the Wix-side feature inventory is from (a) cf-3qt epic Phase 3 spec, (b) cfw codebase references to Wix backend, (c) Wix Members Area documented defaults.

> **TL;DR.** Five of five Phase 3 deliverables are present in cfw and structurally correct. One spec-mandated surface is **missing entirely** (loyalty points + tier display on the Overview), one structural gap exists (no saved-addresses page), and the signup field set is **narrower** than the Wix default. PDP/loyalty wiring is in place on the backend (`managePushPreferences` exists, member API is wired) — surfacing it on the dashboard is the gap.

## Pages audited

| Surface | cfw path | Wix prod path | Status |
|---|---|---|---|
| Sign in | `/account` | `/account/login` (Wix Members default) | ✅ Present |
| Sign up | `/account` (toggle within `AccountSignIn`) | `/account/login` (Wix Members default; toggle within) | ✅ Present, narrower fields |
| Forgot password | `/account/forgot-password` | `/account/login?forgotPassword=true` | ✅ Present |
| Member dashboard / overview | `/dashboard` | `/account/my-account` | ⚠ Present, missing tier+points |
| Order history | `/dashboard/orders` | `/account/my-orders` | ✅ Present |
| Wishlist | `/dashboard/wishlist` + `/wishlist-share/[token]` | `/account/my-wishlist` | ✅ Present + share (richer than Wix) |
| Profile | `/dashboard/profile` | `/account/my-account/profile` | ✅ Present |
| Preferences (push + email) | `/dashboard/preferences` | (Wix has separate notification settings) | ✅ Present (CF-specific surface) |
| Logout | `LogoutButton` component on Profile | `/account/logout` | ✅ Present |
| **Addresses** | — | `/account/my-addresses` | ⛔ **Missing** |
| **Loyalty / CF+ tier + points** | — (mentioned only as preference toggle) | Surfaced in member area + Wix Stores checkout | ⛔ **Missing from dashboard** |
| Subscriptions / Bookings | — | (N/A for futon retail) | ✅ N/A |
| Public profile / Community | — | Wix Members default | ✅ N/A — intentional opt-out |

## Reading guide

- ✅ = cfw parity met or **better** than prod (preserve)
- ⚠ = cfw is structurally present but **incomplete** vs prod or vs Phase 3 spec
- ⛔ = cfw has a **gap vs Phase 3 spec or vs Wix default**

## Phase 3 spec recap (cf-3qt)

> *"Login/Signup via Wix OAuth. Member dashboard (orders, points, tier — CF+ Membership backend). Order history. Wishlist + share. Profile settings (email prefs, push prefs — reuse managePushPreferences webMethod)."*

5 named surfaces:
1. ✅ Login/Signup via Wix OAuth — shipped (`AccountSignIn`, `SignUpForm`, `ForgotPasswordForm`; cf-3qt.8.A flow wired through Wix Headless OAuth, redirect-back to `next` param)
2. ⚠ Member dashboard (orders, points, tier) — orders shipped; **points + tier missing**
3. ✅ Order history — shipped (`/dashboard/orders` → `OrderHistoryList`; reads via `getOrdersForMember({ contactId, tokens })`; statuses humanized; date/total/item-count rendered)
4. ✅ Wishlist + share — shipped + **richer than Wix prod**: `/wishlist-share/[token]` enables share-by-link, which Wix Members defaults do NOT offer
5. ✅ Profile settings (email + push prefs) — shipped via `PreferencesForm`; calls `managePushPreferences` webMethod per spec (preferences-state action wraps the Velo call)

## Detailed gap inventory

### ⛔ Gap 1 — Loyalty tier + points absent from dashboard overview (P1)

**Where:** `src/app/(member)/dashboard/page.tsx`. The current overview renders two `EmptyCard`s (Recent orders + Wishlist) — no points balance, no tier badge, no "X points to next tier" affordance.

**Where the spec called for it:** cf-3qt Phase 3, "Member dashboard (orders, **points, tier** — CF+ Membership backend)." The CF+ membership backend exists (Wix Stores Members + tier webMethods are referenced in `src/lib/wix/members.ts`), but the data is not pulled into the dashboard.

**What prod likely has:** Wix Members + CF+ membership configuration typically shows current tier, points balance, and next-tier threshold on the member home. Without prod-login access I can't pixel-confirm, but Stilgar's PAIR REVIEW step should validate against the live prod member area.

**Recommendation (P1, post-Vercel-credit-restore):**
1. Add `getMyLoyaltyTier()` + `getMyPointsBalance()` server actions (or one combined `getCfPlusMembershipSummary()`) that hit existing CF+ Velo webMethods.
2. Surface a `<MembershipSummaryCard>` at the top of `/dashboard/page.tsx` showing tier badge, points balance, and progression bar to next tier.
3. Add `accessibilityLabel` per the cf-7tkf a11y P2 pattern.
4. TDD: mock the Velo response shape (per cf-3qt Phase 3 mocking convention) and assert tier badge renders, points format with commas, progression bar reflects threshold.

**Estimated scope:** ~1 server action file + 1 component + tests. ~2-3 hours of focused work.

### ⛔ Gap 2 — No saved-addresses page (P2)

**Where:** No `/dashboard/addresses` route exists. `find 'src/app/(member)' -name "*address*"` returns empty.

**What prod has:** Wix Members defaults include `/account/my-addresses` for saved shipping + billing addresses. The Wix Stores checkout reads from this collection on the buy-flow.

**Why this matters at cutover:** When a customer's checkout pre-populates from saved addresses on prod (Wix), the cfw cutover loses that affordance. They'll be retyping addresses every checkout until cfw wires it.

**Recommendation (P2, post-cutover acceptable):**
1. Add `/dashboard/addresses/page.tsx` that lists `client.members.queryMembers()` → `contact.addresses[]` for the current member.
2. Edit/Add/Delete flows go through the Wix Headless Members SDK or a thin Velo wrapper.
3. Cart/checkout already reads from this collection on the Wix side; on cfw the checkout path needs `getMemberAddresses()` to pre-fill.
4. **Defer this to Phase 8 polish** if cutover-day order rate is the priority — most customers retyping addresses once is recoverable; persistent address loss is not.

### ⚠ Gap 3 — Signup field set narrower than Wix default (P2)

**Where:** `src/components/account/SignUpForm.tsx` lines 7-22 — fields are `email`, `password`, `confirm`. No `firstName`, `lastName`, no terms-acceptance checkbox, no newsletter opt-in.

**What prod has:** Wix Members default signup captures first name + last name + a terms-of-service checkbox. Some configurations add a marketing opt-in (often pre-checked, which is its own dark-pattern concern but matches prod behavior).

**Why this matters:**
- Without first/last name at signup, the member record is sparse on day 1 — `member.contact.firstName` reads as null until the user visits `/dashboard/profile` and fills it in. Order-confirmation emails ("Hi {firstName}") then degrade to "Hi" or "Hi customer".
- No terms-acceptance checkbox is a minor compliance risk (terms must be linked + acknowledged somewhere; today this is implicit in account creation but not auditable).

**Recommendation (P2):**
1. Add first name + last name fields to `SignUpForm`. Persist via `client.members.updateMember({ contact: { firstName, lastName }})` after register succeeds.
2. Add a "I agree to the Terms" checkbox with link to `/terms-of-service`. Required for submit.
3. Consider — and document — whether to add newsletter opt-in (pre-checked is a UX trade-off; default-unchecked aligns with cf-y2i.1 newsletter-modal-defer policy).

### ✅ Wishlist share is richer than Wix prod (preserve)

The `/wishlist-share/[token]` route (with the matching `src/app/api/wishlist` server actions) lets a logged-in member generate a shareable wishlist link that anonymous visitors can view. Wix Members defaults do not offer this. This is preserved richness — do not regress at cutover.

### ✅ Preferences surface is CF-specific (preserve)

`/dashboard/preferences` with `PreferencesForm` ties into the `managePushPreferences` Velo webMethod (Phase 3 spec explicitly named this). The push-preference taxonomy (tier updates, order shipping, marketing, etc.) is CF-specific and matches what cfutons_mobile uses. Wix Members defaults do not have this — preserve.

## Verification (local, no Vercel push)

- `npx tsc --noEmit` — clean for all `src/app/(member)/**` + `src/app/account/**` files (verified during this audit).
- `npx vitest run src/__tests__/AccountPage.test.tsx src/__tests__/DashboardShell.test.tsx src/__tests__/MemberLayout.test.tsx src/__tests__/wix-members.test.ts src/__tests__/auth-member.test.ts` — to be run by next agent (this audit is structural/static, not functional regression).

## Recommended ship order (post-credit-reload)

1. **Gap 1 (P1) — loyalty tier + points on overview** — Phase 3 spec mandate; ship before Phase 6 sign-off.
2. **Gap 3 (P2) — signup first/last name + terms** — small, low-risk, improves order-email quality from day 1.
3. **Gap 2 (P2) — saved addresses** — defer to Phase 8 polish; document for Phase 6 sign-off but don't block cutover on it.

## What this audit could NOT verify (Phase 6 sign-off owed)

- Pixel-level visual parity (no prod-login session from this sandbox).
- Live data shapes returned by CF+ Velo webMethods (need a real signed-in member request).
- Cross-device session persistence (cfw cookies vs Wix Members OAuth session bridging).
- Checkout pre-fill regression from missing addresses page (needs end-to-end test on Vercel preview, which is gated on credit-reload).

Recommend pairing this static audit with a live Stilgar / Mayor pass once Vercel credits restore: sign in to a member account on both cfw preview and prod, walk through every dashboard surface, compare side-by-side.

## Refs

- Bead: cf-d41j (cf-3qt.6)
- Epic: cf-3qt (Full migration: Next.js + Wix Headless)
- Sibling audit: cfw-y2i (visual parity for home/PDP/cart — does NOT cover member pages)
- Phase 3 spec: cf-3qt epic body §"Phase 3 — Account (4 days)"
- Standing orders observed: 5-agent review before merge (all repos), Vercel credit freeze on cfw (~2 days from 2026-05-15)
