# cf-0klm: GDPR-Sound ISR via Static Consent Default + Client-Side Update

**Status:** DESIGN PROPOSAL — **gated on mayor approval** of cf-0oj5.fu2 Option A
**Bead:** cf-0klm (P2)
**Author:** godfrey
**Date:** 2026-05-16
**Spike:** see cf-0klm bead comment for the discovery investigation that produced this design

---

## Problem

The cfw root layout reads `cookies()` for consent banner state. Per Next.js App Router rules, **any `cookies()` call in a server component opts the route AND all children out of ISR**. cf-0oj5 PR #704 shipped `revalidate=3600` to fix the PDP LCP regression but is empirically a no-op: all routes return `cache-control: private, no-cache, no-store, max-age=0, must-revalidate` + `x-vercel-cache: MISS`.

Two server-side `cookies()` calls drive the opt-out:

1. **`src/app/layout.tsx:95-97`** — reads `cf_consent` to populate `<ConsentBanner initialChoice={...} />`.
2. **`src/components/analytics/ConsentMode.tsx:22-23`** — reads `cf_consent` to emit an inline gtag-default `<script>` in `<head>`.

Naive fix (move both to client) **breaks GDPR**: the consent default snippet MUST execute before any analytics tag fires. If we move ConsentMode to client-only, GA4/Meta/TikTok/Pinterest pixels may load with no consent default — a regulatory risk in EEA/UK/CH.

## Proposed architecture

### 1. ConsentMode: static "all denied" default (no `cookies()`)

ConsentMode becomes a synchronous server component that emits an inline `<script>` element with a hardcoded "all denied" gtag default snippet. No cookie read; the snippet is byte-identical across all requests, so ISR can cache the layout output.

GDPR posture: all four signals (`ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`) default to `'denied'`. Pixels that gate on consent state will not fire until an explicit grant.

Snippet content (template, not literal JSX):

```text
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function(){dataLayer.push(arguments);};
gtag('consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
```

This is the same snippet shape ConsentMode emits today, just without the per-cookie variation. The forward-slash escape (`\/`) for `</script>` injection guard is preserved.

### 2. New ConsentClientBoot: post-hydration `gtag('consent', 'update', ...)`

A new client component (`"use client"`) reads `document.cookie` in `useEffect`, parses the `cf_consent` value via the existing `parseConsentCookie` helper, and emits `gtag('consent', 'update', map)` if the parsed choice is `"granted"` or `"denied"`. No-op for `"unknown"` (first-time visitor — banner will show + handle).

The window.gtag global is guaranteed to exist by the time the effect fires because ConsentMode's inline script ran during initial document parsing.

Component renders `null` (no DOM); it's purely a side-effect hook.

### 3. ConsentBanner: read cookie in `useEffect` (drop `initialChoice` prop)

ConsentBanner becomes self-contained: no `initialChoice` prop, no SSR-sourced state. On mount, it reads `document.cookie` (same pattern as ConsentClientBoot), parses the choice, and stores it in `useState`. The banner is visible only when `choice === "unknown"` AND a `hydrated` flag has flipped (set in the same effect).

For returning users with a stored "granted" / "denied" choice, the banner stays hidden — `hydrated` flips and `choice !== "unknown"` short-circuits the render. Net effect: zero banner flicker for returning users.

For first-time visitors, the banner appears one tick after hydration — same UX as today, sourced client-side.

### 4. Layout: drop `cookies()` call

Remove the `import { cookies } from "next/headers"` and the `const consentChoice = parseConsentCookie(...)` line. Replace `<ConsentBanner initialChoice={consentChoice} />` with `<ConsentBanner />`. Add `<ConsentClientBoot />` to the same render slot as ConsentMode.

---

## Flicker mitigation (the one trade-off)

CSS-only backup if the React state approach proves jumpy: set the banner root to `display: none` by default in CSS, then use a tiny inline `<head>` script (no React) that reads `document.cookie` and adds a class to `<html>` if no choice cookie is present. This avoids the React state dependency entirely. Marginally more complex but ZERO frames of incorrect render.

Default approach in this design: React state + `hydrated` flag. Falls back to CSS-only if testing surfaces a visible flicker on slow devices.

---

## Test surface (3 files + 1 e2e)

| File | Purpose | Cases |
|---|---|---|
| `src/__tests__/ConsentModeStaticDefault.test.tsx` (new) | Pin static-default snippet, assert NO cookie dependency | 6 |
| `src/__tests__/ConsentClientBoot.test.tsx` (new) | Pin client-side `gtag('consent', 'update', ...)` from cookie | 5 |
| `src/__tests__/ConsentBanner.test.tsx` (modify existing) | Banner reads cookie in useEffect, no `initialChoice` prop | 3 modified |
| `e2e/consent-default-then-update.spec.ts` (new) | Network ordering: default fires before pixels load **+ first-time visitor sees banner with all-denied default still emitted** (rennala phase-2 note 2) | 2 |

Test stubs ship as part of this PR; bodies fill in once mayor approves.

### First-time visitor regression pin (rennala phase-2 note 2)

The e2e spec includes a second case: clear cookies, load page, assert (a) the banner element is visible, AND (b) the gtag default snippet emits with ALL FOUR signals as `'denied'`. Failing this catches:

- **Silent disappearance** of the banner UI for first-time visitors (GDPR-mandated surface).
- **Accidental "granted" leak** in the static default snippet — e.g. a refactor that re-introduces per-cookie variation.

Both directions of regression should fail loud at e2e time, before reaching production.

---

## ISR verification plan (post-implementation)

Once the refactor is on a Vercel preview, repeat the empirical cache-header check:

```bash
curl -sS -D - -o /dev/null "$PREVIEW_URL/products/kingston-futon-frame" \
  | grep -i 'cache-control\|x-vercel-cache'
```

**Acceptance:** `cache-control: s-maxage=3600, stale-while-revalidate=<N>` AND `x-vercel-cache: HIT` (or PRERENDER) on second request.

Then re-run Lighthouse to confirm the cf-0oj5 acceptance criteria (perf ≥ 80, LCP ≤ 3.5s on kingston-futon-frame).

---

## Per-pixel `wait_for_update` verification table (rennala phase-2 note 1)

The "most pixels gate on consent state + re-fire on update" framing in the Risks section needs per-pixel substantiation. The cf-0klm.t1 implementation PR must verify each pixel against the "denied → update" transition pattern before merge.

| Pixel | Consent-mode support | "denied → update" behavior | cf-0klm.t1 acceptance |
|---|---|---|---|
| **GA4 (gtag)** | Native | Documented Consent Mode v2; `wait_for_update` parameter on `gtag('consent', 'default', ...)` deferring tag fires until update arrives | Verify `wait_for_update: 500` (ms) is set on the default; tag fires with the updated state |
| **Meta `fbq`** | Pixel Consent API | `fbq('consent', 'grant')` and `fbq('consent', 'revoke')` toggle the pixel; verify Meta SDK respects denied-default until explicit grant | Confirm no `fbq('init', ...)` runs before consent update if user has stored "denied" |
| **TikTok `ttq`** | Limited (event-level) | TikTok pixel doesn't have a Consent Mode parallel; uses event-level consent params. Verify the wrapper component reads consent state before calling `ttq.track(...)` | `ttq.track` calls gate on `window.gtag` consent state via custom wrapper |
| **Pinterest `pintrk`** | Partial | Pinterest doesn't expose a formal consent API; their docs recommend gating `pintrk()` calls on consent. Same wrapper pattern as TikTok | Same as TikTok — wrapper gates `pintrk(...)` on consent state |
| **Cloudflare Turnstile** | Consent-neutral | Turnstile issues a challenge token, not user-tracking analytics. No consent-mode handling required (per rennala note) | No change; verify the docs/design note reflects "consent-neutral" status |

**Action for cf-0klm.t1:** before implementation merge, run a smoke e2e against each pixel's network request under three scenarios: cookie absent (denied default), cookie="granted" (update fires, tag re-emits), cookie="denied" (no upgrade, no tag emit). The per-pixel verification table above documents the expected behavior; the e2e validates it.

---

## Risk + rollout

**Risks:**

1. **GDPR audit signoff.** The static-default + client-update pattern is standard Consent Mode v2 architecture (Google's documented pattern), but worth a legal/compliance review before deploying to EU traffic.
2. **Pixel race condition.** If a pixel script executes BEFORE `ConsentClientBoot` fires the consent update, it sees the "denied" default and may not record the event. Mitigation: most pixels gate on consent state via `wait_for_update` — they re-fire automatically after the update. Verify per-pixel.
3. **A/B test re-baseline.** Any active A/B experiments measuring conversion may shift slightly because the "first-paint default" briefly differs for ~50ms. Mitigation: deploy outside an active experiment window.

**Rollout (phased):**

1. **Phase 1 (this PR):** docs + test stubs only — no code change on main. Mayor reviews architecture.
2. **Phase 2 (cf-0klm.t1):** implementation PR with full test bodies + Vercel preview verification.
3. **Phase 3 (cf-0klm.t2):** Lighthouse re-measurement + close cf-0oj5 acceptance criteria.
4. **Phase 4 (cf-0klm.t3):** if compliance review surfaces issues, address before prod cutover.

---

## Refs

- cf-0oj5 PR #704 (merged-but-no-op, this design unblocks it): https://github.com/DreadPirateRobertz/carolina-futons-web/pull/704
- cf-0klm bead investigation: see bead comment 2026-05-16
- Google Consent Mode v2 reference: https://developers.google.com/tag-platform/security/guides/consent
- Next.js dynamic-API opt-out rules: https://nextjs.org/docs/app/building-your-application/data-fetching/fetching
