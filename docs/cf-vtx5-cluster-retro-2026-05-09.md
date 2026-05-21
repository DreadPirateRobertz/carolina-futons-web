# cf-vtx5 PDP Cluster Retro — 2026-05-09

**Retro author:** radahn  
**Bead:** cfw-w5r  
**Coverage:** PRs #1168 #1172 #1173 #1174 (carolina-futons/Velo) + cfw #25 #26 #27 (carolina-futons-web)  
**Date of retro:** 2026-05-20

---

## Cluster Summary

| PR | Repo | Bead | Title | Status |
|----|------|------|-------|--------|
| #1168 | Velo | cf-vtx5 | 5 module dispatchers + 2 concrete gaps | MERGED 2026-05-09 |
| #1172 | Velo | cf-yvs4 (fold 1) | Build-break fix + survey shim + dispatch hardening | MERGED 2026-05-09 |
| #1173 | Velo | cf-yvs4 (P0) | IDOR defense + lying-status fix (22 routes) | MERGED 2026-05-09 |
| #1174 | Velo | cf-0h9q | submitCommunityPhoto backend + HTTP wrapper | MERGED 2026-05-09 |
| #25 | cfw | cf-2v2 | Narrow catch in wix/products.ts | **CLOSED, not merged** |
| #26 | cfw | cf-0jm | a11y aria-live + arrow-key nav | MERGED 2026-04-18 |
| #27 | cfw | cf-kee | @sentry/nextjs + captureException in logWixFailure | MERGED 2026-04-18 |

---

## What Shipped

### cf-vtx5 dispatcher pattern (PRs #1168–#1173)

22 cfw→Velo routes had silently 404'd in production since launch. Root cause: Wix does not auto-route `/_functions/foo/bar` to a webMethod named `bar` — only `post_foo(request)` handlers are reachable. The dispatchers add a registry-gated `_veloDispatch()` helper that reads `request.path[0]`, looks up the method in a per-module allowlist, and spreads `body.args`.

**Dispatchers shipped:**

| Dispatcher | Methods covered | cfw caller |
|------------|----------------|------------|
| `post_gamificationCore` | 8 methods | `app/actions/gamification.ts` (`g(method)`) |
| `post_loyaltyService` | 12 methods | `app/actions/loyalty.ts` (`m(method)`) |
| `post_pushNotificationService` | 2 methods | `app/actions/preferences.ts` (`m(method)`) |
| `post_wishlistService` | 5 methods | `app/actions/wishlist.ts` (`w(method)`) |
| `post_styleQuiz` | 4 methods | `lib/wix/style-quiz.ts` |
| `post_recordSpinGrant` | grantSpin wrapper | `lib/wix/spin.ts` |
| `post_submitSurvey` | submitSurveyResponse shim | `app/actions/survey.ts` |
| `post_submitCommunityPhoto` | submitCommunityPhoto | `app/actions/community.ts` |

**cf-yvs4 security layer (PR #1173):** Added `_veloDispatchSoftFailStatus()` helper to flip `{success:false}` soft failures to 4xx (401 auth, 429 rate-limit, 404 not-found, 400 default) across all 22 routes. Added IDOR defense on `post_submitSurvey` (wrapper-level memberId-scoped Survey lookup before delegating to webMethod).

### cfw side (PRs #26, #27)

- **#26 (cf-0jm):** Fixed double `aria-live` region in PLPControls, added arrow-key navigation to filter chips, documented state duplication pattern.
- **#27 (cf-kee):** Wired `@sentry/nextjs` and exposed `captureException` through `logWixFailure` so Wix SDK failures now land in Sentry.

---

## P0/P1 Gaps Found

### P1 — `referralService` dispatcher missing (all referral routes still 404)

`app/actions/referral.ts` calls `getMyReferralCode`, `getMyReferralStats`, `getReferralByCode`, `claimReferral` via `/_functions/referralService/<method>`. The backend exports are named differently (`getReferralLink`, `getReferralStats`, `redeemReferralCode`). #1168 explicitly held this pending cfw-side rename or backend aliasing.

**Status:** No dispatcher. All referral routes return 404 in production.  
**Action:** New bead needed — either rename cfw callsites to match backend exports or add backend aliases. Not straightforward; needs alignment between cfw and Velo owners.

### P1 — `giftRegistry` dispatcher missing

`app/actions/registry.ts` uses `r(method)` with `giftRegistry/<method>` path. This was not in cf-jqkg's 22-route audit. #1168 surfaced it during callsite probe but did not bead it.

**Status:** No dispatcher. All gift registry routes 404 in production.  
**Action:** New bead — pattern is identical to existing dispatchers; 1-2 hours of work once method list is confirmed from `giftRegistry.web.js` exports.

### P1 — cfw #25 (cf-2v2) CLOSED without merging

The narrow-catch fix for `wix/products.ts` (5 accessor catch blocks re-throwing non-Wix errors — `TypeError`, `ReferenceError` — instead of swallowing them as graceful degradation) was CLOSED rather than merged. The PR was stacked on #24 (cf-kee); once #24 merged, #25 was closed but the code change was not re-submitted.

**Impact:** Non-Wix errors (programmer bugs, import failures) in product accessors continue to be silently swallowed and returned as empty product results. No Sentry event fires. Invisible failure.  
**Action:** New PR needed — re-apply diff from closed #25 onto current main.

---

## Test Coverage Assessment

### cfvtx5Dispatchers.test.js (143 tests, PR #1173)

Covers: success path, unknown_method 404, invalid_json 400, args_must_be_array 400, server_error 500, auth 401, IDOR on submitSurvey.

**Gap found:** Zero-arg methods not covered. `_veloDispatch` returns 400 for `args_must_be_array` when `body.args` is absent. `gamificationCore/getActivityFeed` is a zero-arg method — if cfw sends `{}` (no `args` field), the dispatcher returns 400 instead of calling through. Tests don't exercise this path. If cfw's `velo-client.ts` always sends `args: []` for zero-arg calls this is fine; if it omits `args` for zero-arg calls there is a live regression.

**Recommendation:** Add one test: `post_gamificationCore` with body `{}` (no `args`) — verify it routes correctly or confirm cfw always sends `args: []`.

### wishlistServiceDispatcher.cfvtx5.test.js (rennala, PR #1164)

PR #1173 changed line 133 from expecting 200 to 401 for unauthenticated path — pinged rennala for sign-off in the PR. No separate confirmation recorded. Need to verify the test file reflects the 401 contract on main.

### Missing: per-route smoke tests for referralService and giftRegistry

No dispatchers, no tests. When dispatchers are added, tests must follow the cfvtx5Dispatchers.test.js pattern.

### communityPhoto.test.js (20 tests, PR #1174)

Good coverage: validator, webMethod, HTTP wrapper. Rate-limit path (fails-open) is tested. https-only URL guard tested. No test for `CommunityPhotos` CMS collection missing (Stilgar setup pending) — acceptable since that's a deploy concern, not a code concern.

---

## Contract Inconsistency: cf-yvs4 4xx vs cf-mgnh 200+envelope

### The problem

PR #1172 changed `post_recordSpinGrant` unauthenticated from 401 → 200+`{success:false}` (matching the webMethod's contract). PR #1173 (cf-yvs4) flipped it back to 401 via `_veloDispatchSoftFailStatus`. The same debate exists for `post_submitSurvey` (no-survey-found was 404 in #1168, became 200+envelope in #1172, back to 404 via the soft-fail helper in #1173).

This reflects an unresolved architecture question: HTTP semantic status vs. business-logic envelope. cf-mgnh (rennala) standardized on 200+envelope for business errors in the webMethod layer. cf-yvs4 (radahn) standardized on 4xx at the wrapper layer. Both are in main.

### Why this is risky

`_veloDispatchSoftFailStatus` maps HTTP status by regex-matching error message strings. If a webMethod changes its error message wording (`"Authentication required"` → `"Please log in"`), the HTTP status silently changes from 401 to 400. cfw callers that branch on `res.status === 401` to redirect to login will silently break.

### Recommendation

Establish one contract and apply it across all dispatchers. Options:
- **Option A (status-based):** Keep cf-yvs4's 4xx mapping. Require all webMethod auth errors to use a stable sentinel string (e.g. `AUTH_REQUIRED`) rather than a human-readable message.
- **Option B (envelope-based):** Revert to 200+envelope for all dispatcher paths. cfw `velo-client.ts` must branch on `body.success` not `res.ok`. Already partially in place.

**Bead:** File a P2 consistency bead. Decision needs melania + rennala alignment before any new dispatchers are added.

---

## Follow-up Beads Needed

| Priority | Title | Notes |
|----------|-------|-------|
| P1 | `referralService` dispatcher (name mismatch) | Needs cfw/Velo owner alignment on naming |
| P1 | `giftRegistry` dispatcher | 1–2h, same pattern as existing dispatchers |
| P1 | Re-open cf-2v2: narrow catch in wix/products.ts | Re-apply closed #25 diff to current main |
| P2 | Zero-arg dispatch test coverage | Verify `getActivityFeed` path with empty body |
| P2 | Dispatcher contract consistency (4xx vs 200+envelope) | Needs melania + rennala alignment |
| P2 | wishlistServiceDispatcher.cfvtx5 unauthenticated test update | Confirm line 133 is 401 on main |

---

## Summary Verdict

The cluster shipped the right fixes for the right P0 (22 silent 404s). The IDOR defense and lying-status fix are sound. Three gaps remain open: two missing dispatchers (referralService, giftRegistry) and a closed-without-merge cfw PR (cf-2v2). The 4xx vs 200+envelope contract inconsistency is an architecture debt that will surface as a cfw bug if left unresolved.
