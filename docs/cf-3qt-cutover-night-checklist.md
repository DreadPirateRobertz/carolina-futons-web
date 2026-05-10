# cf-3qt Phase 8 — Cutover Night Master Checklist

> **Bead:** cf-2r02 · **For:** Stilgar (executes) · **On-call:** mayor + crew **All times relative to T = 0 (the DNS flip).** Print this document and keep it on the desk.

This is the **linear, sequenced** play-by-play for the night of cutover. Each checkpoint says exactly what to run, what to verify, and what triggers escalation. The deep-dive runbooks are referenced inline — open them in a second window only when a checkpoint says to.

> **Reference docs (have these open):**
> - [`docs/vercel-domain-setup.md`](./vercel-domain-setup.md) — domain add + SSL verify
> - [`docs/cf-3qt/GSC-SUBMISSION-RUNBOOK.md`](./cf-3qt/GSC-SUBMISSION-RUNBOOK.md) — Search Console steps
> - [`docs/cf-3qt-rollback-runbook.md`](./cf-3qt-rollback-runbook.md) — DNS revert if cutover fails
> - [`scripts/pre-cutover-monitor.sh`](../scripts/pre-cutover-monitor.sh) — rolling 60s sweep
> - [`scripts/post-cutover-smoke.sh`](../scripts/post-cutover-smoke.sh) — one-shot 4-check gate

---

## T-24h — pre-cutover prep

| Step | Action | Verify | If failed |
|---|---|---|---|
| 1 | Lower DNS TTL on `carolinafutons.com` apex + `www` to **300 s** at registrar | `dig +noall +answer carolinafutons.com` shows TTL ≈ 300 | abort cutover; TTL must propagate before flip |
| 2 | Snapshot current Wix Studio DNS targets | `dig +short carolinafutons.com www.carolinafutons.com > ~/cfw-cutover-dns-snapshot-$(date +%Y%m%d).txt` | n/a — required for rollback |
| 3 | Confirm Wix Studio site is **Published** (not Draft) | Wix dashboard says "Published"; `https://<wix-default-url>` renders the live site | re-publish before continuing |
| 4 | Confirm `WIX_CLIENT_ID_HEADLESS` is set in Vercel **Production** environment | Vercel dashboard → Settings → Environment Variables | add it; redeploy production |
| 5 | Confirm `NEXT_PUBLIC_SITE_URL=https://www.carolinafutons.com` is set in Vercel Production env (cf-gnmu) | Vercel dashboard | add it; redeploy production |
| 6 | Run a final Lighthouse pass on Vercel preview vs Wix Studio (per `lighthouse-pre-cutover-2026-05-05.md`) | LCP / TBT within budget on the 5 baseline pages | abort cutover if perf regression > target |
| 7 | Spin up `pre-cutover-monitor.sh` in a tmux pane against the **Vercel preview URL** | Logging to `/tmp/cf-cutover-monitor-<DATE>.log`; all 10 critical paths green for 30 min | abort cutover if persistent 5xx or wrong-content |
| 8 | Capture Vercel deploy ID for forensics | `vercel inspect carolina-futons-web` → save to snapshot file | n/a |

**Stilgar/melania go/no-go decision before T-2h.**

---

## T-2h — final confirmations

| Step | Action | Verify | If failed |
|---|---|---|---|
| 9 | All Phase-8-prereq beads CLOSED (cf-3qt.7 SEO, cf-3qt.6 parity audit, cf-3qt.8 sub-tasks except the cutover itself) | `bd ready --label cf-3qt.8` shows zero blockers | hold cutover; finish prereqs |
| 10 | mayor + on-call crew on the cutover-window pager | Slack / on-call rotation acknowledged | reschedule cutover |
| 11 | `post-cutover-smoke.sh` dry-run against the Vercel preview URL (NOT the production domain yet) | All 4 checks PASS against the preview URL using `WIX_CLIENT_ID_HEADLESS` | fix before flipping DNS |
| 12 | Wix Studio dashboard → Triggered Emails populated (cf-c6g5) | All 13 templates Published | hold cutover; cf-c6g5 is a Phase 8 prereq |

---

## T-30m — domain prep on Vercel

Per [`docs/vercel-domain-setup.md`](./vercel-domain-setup.md):

| Step | Action | Verify |
|---|---|---|
| 13 | Add `carolinafutons.com` + `www.carolinafutons.com` to the Vercel project | Both appear in Settings → Domains |
| 14 | Vercel issues SSL certificates | Both domains show "Valid" SSL once DNS resolves |
| 15 | Configure apex ↔ www redirect (decide: apex → www, or www → apex) | Vercel Settings → Domains |

**Vercel is now ready to receive traffic. DNS is still pointed at Wix.**

---

## T = 0 — DNS flip

```
[T=0]  STILGAR: flipping DNS — carolinafutons.com → Vercel
```

| Step | Action |
|---|---|
| 16 | At the registrar: replace the apex A record with Vercel's IP(s) per `vercel-domain-setup.md` |
| 17 | Replace the `www` CNAME with `cname.vercel-dns.com` |
| 18 | Save. **Note the timestamp.** |

The clock starts here.

---

## T+5m — first smoke

| Step | Action | Verify | If failed |
|---|---|---|---|
| 19 | `dig +short carolinafutons.com` | Resolves to a Vercel IP (`76.76.21.*` / `64.29.17.*` / `216.198.79.*` or `cname.vercel-dns.com`) | wait 5 more min; some ISPs cache stubbornly |
| 20 | Run `bash scripts/post-cutover-smoke.sh https://www.carolinafutons.com` with `WIX_CLIENT_ID_HEADLESS` + `WIX_SMOKE_PRODUCT_ID` set | Exits 0 (4/4 checks pass) | see escalation matrix at end of doc |
| 21 | Visit `https://www.carolinafutons.com` in a fresh browser (clear cache) | Renders Next.js storefront, NOT Wix | escalate |

---

## T+15m — pre-cutover monitor cutover

| Step | Action | Verify |
|---|---|---|
| 22 | Restart `pre-cutover-monitor.sh` against the **production domain** (`https://www.carolinafutons.com`) | All 10 critical URLs green |
| 23 | Hit a PDP, add to cart, walk through to checkout (do NOT complete payment) | Cart redirects to Wix Headless checkout cleanly |
| 24 | Spot-check a Wix Studio dashboard order — confirm a real test order from cfw appears in the Wix Stores admin | Order visible (cart-session dual-write working) |

If steps 19–24 are green, **cutover is provisionally successful.** Continue monitoring.

---

## T+1h — first hour stability

| Step | Action | Verify |
|---|---|---|
| 25 | `pre-cutover-monitor.sh` log review | Zero 5xx, zero non-Vercel responses across all 10 paths |
| 26 | Vercel dashboard → Functions → real-time logs | No unhandled errors / unexpected 5xx |
| 27 | Wix Headless API errors via `vercel logs` filter | None elevated above pre-cutover baseline |
| 28 | Order rate sanity check: orders since T=0 vs. baseline hourly rate | Within ±50 % (small variance expected at night) |
| 29 | Search Console: trigger an inspection for `https://www.carolinafutons.com/` | Returns successfully, indexable |

If any check fails, consult the **rollback decision matrix** ([`cf-3qt-rollback-runbook.md`](./cf-3qt-rollback-runbook.md) §"Decision matrix").

---

## T+1h — Search Console + sitemap

Per [`docs/cf-3qt/GSC-SUBMISSION-RUNBOOK.md`](./cf-3qt/GSC-SUBMISSION-RUNBOOK.md):

| Step | Action |
|---|---|
| 30 | Submit `https://www.carolinafutons.com/sitemap.xml` to Search Console |
| 31 | Submit `https://www.carolinafutons.com/near-cities-sitemap.xml` (cf-l6aj.21 city pages) |
| 32 | Verify `robots.txt` is reachable: `curl -s https://www.carolinafutons.com/robots.txt | head` |
| 33 | Spot-check an indexed URL via "URL Inspection" — should report fetched + indexable |

---

## T+24h — first-day stability report

This is melania's deliverable, not Stilgar's, but Stilgar is the data source.

| Step | Action |
|---|---|
| 34 | Stop `pre-cutover-monitor.sh`. Save the log. |
| 35 | Tally: total uptime %, # of 5xx, # of orders placed, P0/P1 incident count |
| 36 | Vercel Web Vitals dashboard: real-user LCP / INP / CLS distributions vs. pre-cutover baseline |
| 37 | Search Console: index coverage for the new domain, any spike in errors |
| 38 | melania compiles → `docs/cf-3qt-day1-stability-report.md` |

If day-1 is green, monitor continues for 30 days (Phase 9 prereq).

---

## Escalation matrix

| What you see | Action |
|---|---|
| `post-cutover-smoke.sh` exit 1 (DNS) | wait 15 min, re-run; if still 1 after 30 min → ROLL BACK |
| Exit 2 (PLP wrong content) | wait 15 min for cache; ROLL BACK if persistent |
| Exit 3 (Wix Headless OAuth) | **ROLL BACK** immediately |
| Exit 4 (cart) | wait 5 min, re-run; ROLL BACK if persistent |
| `pre-cutover-monitor` shows >5 % 5xx for >10 min | **ROLL BACK** |
| Customer-reported checkout broken | **ROLL BACK** |
| Single-browser issue | forward-fix in cfw, do NOT roll back |
| Search Console reports index drop next-day | DO NOT roll back — file as 8.x recovery bead |

Rollback procedure in [`cf-3qt-rollback-runbook.md`](./cf-3qt-rollback-runbook.md).

---

## Comms templates

### Pre-cutover (T-24h, internal)

```
TONIGHT: cf-3qt Phase 8 cutover at T = <UTC timestamp>.
Vercel deployment carolina-futons-web → carolinafutons.com.
On-call: Stilgar primary, mayor secondary.
Rollback path documented at docs/cf-3qt-rollback-runbook.md.
```

### Post-cutover success (T+1h, internal)

```
Cutover complete at T = <timestamp>.
post-cutover-smoke.sh: 4/4 PASS.
First-hour 5xx: <N>. Orders since cutover: <M>.
Monitor running for 24h; day-1 stability report in 22h.
```

### Customer-facing (only if outage > 5 min)

See `cf-3qt-rollback-runbook.md` §"Step 5 — Comms".

---

## After-action checklist

| Step | Action |
|---|---|
| 39 | Restore DNS TTL to **3600 s** at the registrar (T+24h or later) |
| 40 | Tag the cfw deploy: `git tag -a cutover-<YYYY-MM-DD> <SHA> && git push --tags` |
| 41 | Capture lessons into `docs/cf-3qt-cutover-postmortem-<DATE>.md` |
| 42 | Schedule the 30-day Phase 9 review (cf-3qt.9) |
| 43 | Mark cf-3qt.8 CLOSED with link to the post-mortem |

---

## Refs
- Bead: cf-2r02 (this checklist)
- Phase 8: cf-3qt.8
- Phase 9: cf-3qt.9 (30 days post-stable)
- Rollback: cf-4f6l → `cf-3qt-rollback-runbook.md`
- Domain setup: `vercel-domain-setup.md`
- Search Console: `cf-3qt/GSC-SUBMISSION-RUNBOOK.md`
- Pre-cutover Lighthouse baseline: `lighthouse-pre-cutover-2026-05-05.md`
