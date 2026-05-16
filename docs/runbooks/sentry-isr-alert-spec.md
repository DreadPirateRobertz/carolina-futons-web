# Sentry ISR alert spec — `next.revalidate_reason` tag

**Bead:** cf-czdw (cf-h345.t2)
**Author:** godfrey · 2026-05-16
**Audience:** on-call, ops, Stilgar (Sentry project owner)
**Depends on:** cf-h345.t1 (PR #706, merged — emits the tag)

This document is the operational completion of cf-h345.t1's `onRequestError` wrapper. The wrapper now tags every Sentry event with `next.revalidate_reason` ∈ `{stale, on-demand, none}`. This runbook defines how on-call interprets those tags + when to page.

---

## 1. The tag

Every `onRequestError` event from `instrumentation.ts` carries a `next.revalidate_reason` Sentry tag with one of three values:

| Value | Meaning | Frequency expectation |
|---|---|---|
| `stale` | Next.js ISR background revalidation fired (visit after `revalidate` window expired) and the revalidation render threw | Rare once ISR is live — bounded by traffic × cache-miss-rate |
| `on-demand` | `revalidatePath(...)` or `revalidateTag(...)` call threw during regeneration | Very rare — only fires when explicit invalidation runs (currently no production callers; reserved for future webhook-driven invalidation) |
| `none` | Normal user-facing render error — no revalidation involved | Dominant baseline; this is the existing Sentry error volume |

**Important:** today (2026-05-16), cfw routes are dynamic-render only — the `revalidate` exports on `/products/[slug]`, `/press`, `/community-gallery` are no-op because of the root layout `cookies()` opt-out (see cf-0klm). The tag is in place but will not see `stale` values until cf-0klm resolves and ISR actually activates. This runbook is forward-looking; on-call will reference it when ISR turns on.

---

## 2. Sentry filter queries

**Find all ISR background regen errors (production):**
```
next.revalidate_reason:stale environment:production
```

**Find all on-demand invalidation errors:**
```
next.revalidate_reason:on-demand environment:production
```

**Find normal user-facing errors (exclude ISR noise once ISR is live):**
```
next.revalidate_reason:none environment:production
```

**Find any revalidation-related error (both kinds):**
```
(next.revalidate_reason:stale OR next.revalidate_reason:on-demand) environment:production
```

---

## 3. Alert thresholds + paging policy

**Stale ISR revalidation failures** (the dominant ISR signal):

| Volume | Action | Paging |
|---|---|---|
| `< 3 errors / 5 min` | No-op — within bounded background-regen noise. Each error means one user got served stale content (acceptable per ISR's stale-while-revalidate contract). | None |
| `3–9 errors / 5 min` | **WARN** — Sentry alert fires. Investigate cause (Wix outage? specific route breaking?). Mayor + ops notified via Slack. | Slack only |
| `≥ 10 errors / 5 min` | **PAGE** — Wix integration likely degraded. Background revalidation is failing fast enough that stale-content-served is becoming the norm. PagerDuty page on-call. | PagerDuty |
| `≥ 50 errors / 5 min` | **CRITICAL** — escalate to mayor + Stilgar immediately. Likely full Wix outage. Consider failing over to last-known-good cache (if revalidate window extends past Wix recovery time, ISR keeps serving the page; if window expires, users see error). | Multi-channel |

**On-demand revalidation failures:**

Any non-zero rate is a signal — `revalidatePath`/`revalidateTag` are only fired by explicit code paths. If a single one throws, the code path is broken.

| Volume | Action | Paging |
|---|---|---|
| `1+ errors / 5 min` | **WARN** — Sentry alert fires. Investigate which code path called `revalidatePath`/`revalidateTag` and why it failed. | Slack only |
| `≥ 5 errors / 5 min` | **PAGE** — the explicit invalidation path is broken at non-trivial volume. | PagerDuty |

**Tuning note:** the thresholds above are rough cuts for an 88-product catalog at retail-shop traffic levels. After 14 days of production ISR (post-cf-0klm), revisit + tune based on observed baseline. Initial deploy should set `stale` thresholds 2× the above (more headroom) and tighten once baseline is known.

---

## 4. Distinction: ISR alert ≠ user-facing outage

This is the most important on-call mental model.

**ISR's contract is stale-while-revalidate.** If background regen fails, Next.js serves the previous cached HTML. Users see slightly older content (price/stock could be hours stale), but the site stays up. This is **by design** for resilience.

So an ISR alert ≠ a P0 incident. The alert is a *signal that the upstream data source is degraded*, not a *signal that users are seeing errors*. Compare:

- **`next.revalidate_reason:stale` ↑** = "Wix is having a bad time; we're serving stale data to absorb their failures"
- **`next.revalidate_reason:none` ↑** = "Users are seeing actual errors on the site" (this IS the P0 signal)

**Action priority:** when both fire simultaneously, address `:none` first (user-facing impact), then investigate `:stale` (upstream-cause analysis).

---

## 5. Escalation path

For `stale` page-level alerts:

1. **Confirm scope** — Sentry filter by `routePath` (e.g. `next.revalidate_reason:stale routePath:"/products/[slug]"`). Single-route = one PDP failing to fetch from Wix. Site-wide = Wix degradation.
2. **Check Wix status** — https://status.wix.com/ (or whichever Wix status page is current).
3. **If Wix is up**: investigate the specific route's `getProductBySlug` / catalog call. Check `logWixFailure` events (Sentry context: `wix.method=...`).
4. **If Wix is down**: monitor only. ISR will keep serving cached content as long as the revalidate window hasn't expired. If Wix outage exceeds the revalidate window, switch to "extend revalidate window" or "static fallback" runbook (separate spec, cf-czdw.fu1 candidate).
5. **Escalate to mayor** if rate ≥ 50/5min OR duration ≥ 30 min.

For `on-demand` page-level alerts:

1. **Find the calling code path** — grep for `revalidatePath` / `revalidateTag` calls + cross-reference with Sentry stack trace.
2. **If a webhook trigger**: check the inbound webhook payload + retry logic.
3. **If a manual admin invalidation**: contact the admin who triggered it.
4. **Always**: file a bead capturing the root cause; on-demand failures are rare enough that each one deserves a write-up.

---

## 6. Sentry configuration (one-time setup)

These alert rules must be configured in the cfw Sentry project before the thresholds above can fire. Configuration is owned by Stilgar (Sentry project admin).

**Alert 1: ISR stale warn**
- Trigger: when count of `event.tags["next.revalidate_reason"] == "stale"` matches `>= 3 in 5m`
- Environment: production
- Notification: Slack channel `#cfw-ops`
- Status: NOT YET CONFIGURED (depends on Stilgar)

**Alert 2: ISR stale page**
- Trigger: when count `>= 10 in 5m`
- Notification: PagerDuty integration
- Status: NOT YET CONFIGURED

**Alert 3: On-demand revalidation warn**
- Trigger: when count of `event.tags["next.revalidate_reason"] == "on-demand"` matches `>= 1 in 5m`
- Notification: Slack channel `#cfw-ops`
- Status: NOT YET CONFIGURED

**Alert 4: On-demand revalidation page**
- Trigger: when count `>= 5 in 5m`
- Notification: PagerDuty integration
- Status: NOT YET CONFIGURED

Implementation: Sentry → Alerts → Create Alert Rule. Set the metric to "Number of Errors", filter by the tag, set the threshold + time window, attach the notification integration.

**Smoke test once configured:** trigger a fake `stale` error in a preview deploy (e.g. add a throw in an ISR-active route, force revalidation), confirm the warn-level Slack message fires.

---

## 6.5. Verification — confirm the tag is being emitted

Before relying on the alert rules above, confirm the cf-h345.t1 wrapper is actually firing in production. Sentry search:

```text
project:cfw has:next.revalidate_reason
```

If zero results after a deploy that exercised `onRequestError`, the wrapper isn't being invoked. Likely causes:

1. `instrumentation.ts` not loaded — confirm `register()` was called (Next.js logs `[Instrumentation] register() ran` on cold start)
2. Sentry server config not loaded — confirm `sentry.server.config.ts` exists and imports cleanly
3. Error happened in an edge runtime path — the wrapper runs in both nodejs + edge, but verify `process.env.NEXT_RUNTIME` was set correctly

The contract is pinned in code by `src/__tests__/instrumentation.test.ts` (cf-h345.t1). If a future refactor renames a tag value (e.g. `none` → `normal`), CI fails before the rename can break this runbook's filter queries.

---

## 7.5. When ISR activates: mental-model re-calibration

When cf-0klm lands and ISR turns on for real, this runbook's signal volume changes. **Re-read sections 1, 3, and 4 within 24h of the activation deploy** to re-anchor expectations:

1. **`next.revalidate_reason:none` count will likely DROP** (some baseline errors get re-classified as `:stale` background-regen failures). On-call should NOT interpret the drop as "everything is fixed" — the volume just moved buckets.
2. **`:stale` will go from 0 to non-zero overnight.** The first 24-48h of `:stale` events are not necessarily a regression; they're a new visible signal that was previously invisible. The thresholds in section 3 are pre-tuned for this new baseline.
3. **The "alert ≠ outage" framing (section 4) becomes load-bearing.** Until ISR activates, every Sentry error IS a user-facing render error. After ISR activates, the `:stale` subset is by-design degradation. On-call's first question on any new error becomes "is this `:none` or `:stale`?"

**Action on cf-0klm landing:** sweep recent on-call shifts for any ad-hoc playbook assumptions that "all errors are P-something" — those need refresh to incorporate the new `:stale` bucket as a distinct signal. File a `docs/runbooks/sentry-isr-alert-spec-activation-followup.md` if section 3 thresholds need adjusting after 14 days of observed baseline.

---

## 7. Status (2026-05-16)

| Item | Status |
|---|---|
| `onRequestError` wrapper emitting tag | ✅ live (PR #706) |
| Filter queries documented | ✅ this doc |
| Threshold + paging policy documented | ✅ this doc |
| Escalation path documented | ✅ this doc |
| Sentry alert rules configured | ❌ pending Stilgar (section 6) |
| ISR actually firing (so tag has non-`none` values) | ❌ blocked on cf-0klm |
| Post-deploy baseline tuning (14 days) | ❌ blocked on ISR activation |

The doc is operationally complete; the remaining steps are Stilgar Sentry config + cf-0klm landing for ISR to actually activate.

---

## Refs

- cf-h345.t1 PR #706 (wrapper that emits the tag, merged 2026-05-16)
- cf-h345 bead (parent — ISR follow-ups)
- cf-0klm (blocks ISR activation — see PR #705 design)
- Next.js `onRequestError` docs: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation#onrequesterror-optional
- Sentry tag-based alert configuration: https://docs.sentry.io/product/alerts/create-alerts/
