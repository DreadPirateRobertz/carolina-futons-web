# cf-3qt Phase 8 — Day-1 Stability Report TEMPLATE

> **Bead:** cf-v8jj · **For:** melania (compiles at T+24h post-cutover) · **Source-of-truth doc:** [`docs/cf-3qt-cutover-night-checklist.md`](./cf-3qt-cutover-night-checklist.md) Step 38
>
> **How to use:** copy this file to `docs/cf-3qt-day1-stability-report-YYYY-MM-DD.md`, fill the `[BLANK]`s, commit to main. The compiled report is melania's deliverable to Stilgar + mayor; it gates the 30-day Phase 9 retirement (cf-3qt.9).

---

## Cutover identity

- **Cutover date:** [YYYY-MM-DD]
- **Cutover engineer:** [Stilgar / mayor]
- **PM:** melania
- **Vercel deploy SHA at T = 0:** [git sha]
- **cfw branch tag:** `cutover-[YYYY-MM-DD]`

---

## Timeline

| T-relative | Wall clock (UTC) | Event |
|---|---|---|
| T-24h | [HH:MM] | DNS TTL lowered to 300 s |
| T-2h | [HH:MM] | Final go/no-go confirmed |
| T = 0 | [HH:MM] | DNS records flipped |
| T+5m | [HH:MM] | First `post-cutover-smoke.sh` PASS |
| T+15m | [HH:MM] | `pre-cutover-monitor.sh` switched to production domain |
| T+1h | [HH:MM] | First-hour stability check complete |
| T+1h | [HH:MM] | Sitemap submitted to Search Console |
| T+24h | [HH:MM] | This report compiled |

If any event was delayed or required intervention, note in the **Incidents** section below.

---

## Uptime — first 24 hours

Source: `pre-cutover-monitor.sh` log at `/tmp/cf-cutover-monitor-[DATE].log`.

| URL | Uptime % | Sweeps | 5xx count | 4xx count | Notes |
|---|---:|---:|---:|---:|---|
| `/` | [99.x] | [N] | [N] | [N] | |
| `/shop/futon-frames` | [99.x] | [N] | [N] | [N] | |
| `/shop/murphy-cabinet-beds` | [99.x] | [N] | [N] | [N] | |
| `/shop/platform-beds` | [99.x] | [N] | [N] | [N] | |
| `/shop/mattresses` | [99.x] | [N] | [N] | [N] | |
| `/products/kingston-futon-frame` | [99.x] | [N] | [N] | [N] | |
| `/cart` | [99.x] | [N] | [N] | [N] | |
| `/contact` | [99.x] | [N] | [N] | [N] | |
| `/shipping` | [99.x] | [N] | [N] | [N] | |
| `/returns` | [99.x] | [N] | [N] | [N] | |
| **All paths combined** | **[99.x]** | **[N]** | **[N]** | **[N]** | |

**Target**: ≥ 99.5 % across all paths for green verdict.

---

## Error rates

### Vercel (cfw side)

Source: Vercel dashboard → Functions → first 24h.

| Metric | Value | Pre-cutover baseline | Δ |
|---|---:|---:|---:|
| Total function invocations | [N] | [N] | [+/−x %] |
| Function errors | [N] | [N] | [+/−x %] |
| Function error rate | [x %] | [x %] | [+/−x pp] |
| p95 function duration | [Nms] | [Nms] | [+/−Nms] |

### Wix Headless API (consumer surface)

Source: Vercel logs filtered by `[wix]` / `[velo]` / `VeloRpcError`.

| API | Calls | Errors | Error rate |
|---|---:|---:|---:|
| `currentCart.getCurrentCart` | [N] | [N] | [x %] |
| `currentCart.addToCurrentCart` | [N] | [N] | [x %] |
| `currentCart.removeLineItemsFromCurrentCart` | [N] | [N] | [x %] |
| `currentCart.estimateCurrentCartTotals` | [N] | [N] | [x %] |
| `oauth2/token` (visitor mint) | [N] | [N] | [x %] |
| `/_functions/*` (Velo wrappers) | [N] | [N] | [x %] |

**Target**: error rate ≤ 0.5 % per surface; visitor-token mint ≤ 0.1 %.

---

## Real-User Performance (RUM)

Source: Vercel Web Vitals dashboard, p75 day-1 vs. pre-cutover baseline (`docs/lighthouse-pre-cutover-2026-05-05.md`).

| Page | LCP day-1 (ms) | LCP baseline | Δ | INP day-1 | INP baseline | Δ | CLS day-1 | CLS baseline | Δ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | [N] | [N] | [+/−N] | [N] | [N] | [+/−N] | [0.0x] | [0.0x] | [+/−0.0x] |
| `/shop/futon-frames` | [N] | [N] | [+/−N] | [N] | [N] | [+/−N] | [0.0x] | [0.0x] | [+/−0.0x] |
| `/products/kingston-futon-frame` | [N] | [N] | [+/−N] | [N] | [N] | [+/−N] | [0.0x] | [0.0x] | [+/−0.0x] |
| `/cart` | [N] | [N] | [+/−N] | [N] | [N] | [+/−N] | [0.0x] | [0.0x] | [+/−0.0x] |
| `/design-a-room` | [N] | [N] | [+/−N] | [N] | [N] | [+/−N] | [0.0x] | [0.0x] | [+/−0.0x] |

**Target**:
- LCP p75 ≤ 2500 ms (Core Web Vitals "Good")
- INP p75 ≤ 200 ms
- CLS p75 ≤ 0.1
- Δ vs baseline within ± 10 % on each metric (regressions outside this band trigger a recovery bead)

---

## Commerce metrics

Source: Wix Stores admin → Orders, day-1 window.

| Metric | Day-1 | 7-day pre-cutover daily avg | Δ |
|---|---:|---:|---:|
| Orders placed | [N] | [N] | [+/−x %] |
| Total order value | [$N] | [$N] | [+/−x %] |
| Average order value | [$N] | [$N] | [+/−x %] |
| Cart abandonment rate | [x %] | [x %] | [+/−x pp] |
| Conversion rate (orders / sessions) | [x %] | [x %] | [+/−x pp] |

**Acceptable variance**: ± 30 % for a single day (small sample). Larger swings need investigation but don't necessarily indicate a cutover-related regression.

---

## SEO / discoverability

### Search Console

| Metric | Day-1 | Notes |
|---|---:|---|
| Sitemap submission status | [Success / Pending / Error] | submitted at [HH:MM] |
| URLs in sitemap | [N] | |
| URLs indexed (cumulative) | [N] | will lag — index propagation is not 24h |
| Crawl errors (24h) | [N] | |
| Top 5 crawl error URLs | [list] | |
| Coverage warnings | [count] | |

### Direct probes

```
$ curl -sI https://www.carolinafutons.com/robots.txt | head -1
[paste output]

$ curl -sI https://www.carolinafutons.com/sitemap.xml | head -1
[paste output]
```

Both should be `HTTP/2 200`.

---

## P0 / P1 incidents

Any cutover-related incident with severity P0 or P1.

| Time | Severity | Description | Resolution | Bead |
|---|---|---|---|---|
| [HH:MM] | [P0/P1] | [brief] | [fixed-forward / monitoring / unresolved] | [cf-?] |

If empty: write "(none)". A clean P0/P1 row is the strongest single signal for Phase 9 readiness.

---

## Customer-reported issues

Source: support email + Wix Studio dashboard messages + social DMs.

| Time | Channel | Issue | Reproducible? | Status |
|---|---|---|---|---|
| [HH:MM] | [email/DM/dashboard] | [brief] | [yes/no/partial] | [resolved/open/dismissed] |

If empty: "(none)".

---

## Outstanding regressions

Anything that's broken-but-not-rolled-back. Each becomes a Phase 8.x recovery bead.

| Description | Surface | First seen | Recovery bead |
|---|---|---|---|
| [item] | [page/feature] | [HH:MM] | [cf-?] |

If empty: "(none)".

---

## What was unexpected

Free-form section. Even when day-1 is GREEN, capture the surprises so the post-mortem has them:

- [observation 1]
- [observation 2]
- [observation 3]

Examples to prompt: "Vercel build credit consumption was higher than estimated", "post-cutover-smoke step N took longer than expected because of <reason>", "RUM data took >12h to populate the Vercel dashboard", "search-engine-bot traffic spiked at T+8h", etc.

This section feeds the next-cutover playbook update.

---

## Verdict

Pick one:

- 🟢 **GREEN** — All targets met. No P0/P1 incidents. Cutover is stable. **Proceed to 30-day stability monitoring per Phase 9 prereq.**
- 🟡 **YELLOW** — Targets met but with caveats (single missed metric, isolated incidents resolved within window). Continue monitoring; do NOT yet schedule Phase 9 sign-off — re-evaluate at T+72h.
- 🔴 **RED** — Targets missed (uptime <99.5 %, sustained 5xx tail, or unresolved P0). **Rollback gate revisit** required; see [`cf-3qt-rollback-runbook.md`](./cf-3qt-rollback-runbook.md). If we're past the rollback window (>24h post-cutover), file Phase 8.x recovery beads and escalate to mayor.

### Verdict rationale

[Paragraph or three explaining the verdict. Reference the table rows above. If GREEN, name the strongest evidence. If YELLOW/RED, name what's missing and when it'll be re-evaluated.]

### Phase 9 readiness signal

- [ ] All P0/P1 incidents resolved
- [ ] Uptime ≥ 99.5 % sustained
- [ ] No outstanding revenue-blocking regressions
- [ ] Customer support volume back to baseline
- [ ] Search Console crawl errors trending down

If all five checkboxes can be ticked at T+30d, cf-3qt.9 (Wix Studio retirement) is unblocked.

---

## Sign-offs

- [ ] Stilgar — read + acknowledged
- [ ] mayor — read + acknowledged
- [ ] melania (PM) — author

---

## Refs

- Bead: cf-v8jj (this template)
- Cutover playbook: [`cf-3qt-cutover-night-checklist.md`](./cf-3qt-cutover-night-checklist.md)
- Rollback: [`cf-3qt-rollback-runbook.md`](./cf-3qt-rollback-runbook.md)
- Forward path: [`vercel-domain-setup.md`](./vercel-domain-setup.md)
- Pre-cutover Lighthouse baseline: `lighthouse-pre-cutover-2026-05-05.md`
- Phase 8 master: cf-3qt.8
- Phase 9 retirement: cf-3qt.9
