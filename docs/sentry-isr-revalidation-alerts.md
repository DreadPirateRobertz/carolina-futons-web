# Sentry alert filters — ISR revalidation failures

**Bead:** cf-h345.1.fu1 (cf-0oj5.fu1 follow-up)
**Pairs with:** `instrumentation.ts` `onRequestError` wrapper (cf-h345.1, PR #706)
**Audience:** Stilgar (Sentry org owner), on-call, anyone editing `instrumentation.ts`

PR #706 wraps `onRequestError` so every captured error carries a `next.revalidate_reason` tag (values `stale` | `on-demand` | `none`). This document specifies the Sentry alert filter + thresholds that turn that tag into actionable paging — without it, the tag exists but nobody reads it.

Editing the alert: Sentry UI → **Alerts → Create Alert → Issue Alert**. Use the queries below verbatim so the issue/alert state stays reproducible from this doc.

---

## 1. Alert: silent ISR background revalidation failure

**Severity:** WARNING (not paging — see §4 paging policy)
**Tag query:** `next.revalidate_reason:stale environment:production`

**Why this alert exists.** Per Next.js docs ("Handling uncaught exceptions" in the ISR guide), if a fetch throws during background regeneration the framework continues serving the last good cache entry. The user sees stale content; the system records the error in Sentry but the alert channel doesn't separate it from foreground render errors. Without `revalidate_reason:stale` filtering, a Wix-side outage that quietly degrades cache freshness for hours looks like ambient error noise.

**Trigger conditions (Sentry UI fields):**

| Field | Value |
|---|---|
| When | An issue is seen `N` times in `T` |
| Threshold | `N=10`, `T=1 hour` |
| Filter | `event.tags.next.revalidate_reason equals "stale"` AND `event.tags.environment equals "production"` |
| Action | Send notification → Slack `#cfw-ops-warning` |
| Mute conditions | None — re-fire each hour the threshold trips |

**Threshold rationale.** 10/hour is loud enough to catch a Wix-stores outage (which produces fresh revalidation errors on every cache miss) without spurious page on a single transient network hiccup. PRs that touch cf-h345.1 should bump this only with explicit Stilgar sign-off.

---

## 2. Alert: on-demand revalidation throw

**Severity:** PAGE (treats as a regression — on-demand revalidate is our code, not Wix's)
**Tag query:** `next.revalidate_reason:on-demand environment:production`

**Why distinct from §1.** On-demand revalidations come from cfw Server Actions calling `revalidatePath` / `revalidateTag` (cart actions, contact form, etc.). A throw means our action code is broken — not a downstream platform issue. Page on this immediately.

**Trigger conditions:**

| Field | Value |
|---|---|
| When | An issue is seen `N` times in `T` |
| Threshold | `N=3`, `T=15 minutes` |
| Filter | `event.tags.next.revalidate_reason equals "on-demand"` AND `event.tags.environment equals "production"` |
| Action | PagerDuty (or oncall channel) — same path as `/api/health` flatline |

---

## 3. Why `next.revalidate_reason:none` does NOT need a dedicated filter

`none` is the default — every render error that isn't tied to revalidation carries this tag. The existing baseline Sentry alerts already cover normal render errors; adding a `revalidate_reason:none` filter would just duplicate the default alert path. The tag is still emitted so that operators searching Sentry can write exhaustive queries without worrying about absent-tag edge cases.

---

## 4. Paging policy

| Alert | Channel | Page? | Why |
|---|---|---|---|
| §1 stale (warning) | Slack `#cfw-ops-warning` | No — daytime visual triage | A stale background regen failure is non-user-fatal: cache still serves. Investigate within 1 business hour but no 3am page. |
| §2 on-demand (page) | PagerDuty oncall | Yes — within 5 min | Our code is throwing on cart/checkout/form revalidate paths. Customer-facing breakage path. |
| baseline non-revalidation errors | (existing default) | (existing policy) | Out of scope for this doc. |

---

## 5. Verification — was the tag actually emitted?

Search Sentry for the latest event from cfw:

```text
project:cfw has:next.revalidate_reason
```

If zero results after a deploy that ran `onRequestError`, the wrapper isn't being invoked. Likely causes:
1. `instrumentation.ts` not loaded — confirm `register()` was called (Next.js logs `[Instrumentation] register() ran` on cold start)
2. Sentry server config not loaded — confirm `sentry.server.config.ts` exists and imports cleanly
3. Error happened in an edge runtime path — the wrapper runs in both nodejs + edge, but verify `process.env.NEXT_RUNTIME` was set correctly

Pin the contract in code: `src/__tests__/instrumentation.test.ts` already asserts the tag-value enum and the ordering invariant (setTag before captureRequestError). If a future refactor changes the value set (e.g. renames `none` to `normal`), CI fails — the alert query above remains the canonical operational reference.

---

## 6. When this alert SHOULD start firing

Today (post-PR #706 merge, pre-cf-0klm): all cfw routes are dynamic-rendered due to root layout `cookies()` call. The framework never enters background revalidation, so `next.revalidate_reason:stale` events are zero. The alert sits silent — that is expected, not a misconfiguration.

When cf-0klm lands (consent state moves out of the layout) and ISR comes back online, this alert becomes load-bearing on the first cache miss that fails to regenerate. Setting it up NOW means there's no observability gap window between "ISR works" and "on-call notices ISR is failing silently."

---

## Refs

- cf-h345.1 PR #706 (the wrapper that emits the tag): https://github.com/DreadPirateRobertz/carolina-futons-web/pull/706
- Next.js ISR uncaught-exception behavior: https://nextjs.org/docs/app/guides/incremental-static-regeneration
- Next.js `onRequestError` context schema: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
- cf-h345 parent investigation bead
- cf-0klm (ISR unblock — see PR #705 design)
- Standing order cf-ukc6 (Vercel build credit conservation — this PR is doc-only)
