# cf-3qt Phase 9 — Day-30 Stability Report TEMPLATE

> **Bead:** cf-tqwn · **For:** melania (compiles at T+30d post-cutover) · **Gates:** cf-3qt.9 Wix Studio retirement · **Sibling:** [`cf-3qt-day1-stability-report-TEMPLATE.md`](./cf-3qt-day1-stability-report-TEMPLATE.md)
>
> **How to use:** copy this file to `docs/cf-3qt-day30-stability-report-YYYY-MM-DD.md` (date = day-30 boundary), fill `[BLANK]`s, commit to main. The compiled report is the **gating artifact for Phase 9** — it determines whether we unpublish Wix Studio + evaluate the Wix Premium downgrade.

This is the bigger decision than day-1. Day-1 confirmed cutover stuck. Day-30 confirms it stays.

---

## Cutover identity

- **Cutover date:** [YYYY-MM-DD] (T = 0)
- **Day-30 date:** [YYYY-MM-DD]
- **Cutover engineer:** [Stilgar / mayor]
- **PM:** melania
- **Cutover deploy SHA:** [git sha]
- **Day-30 deploy SHA:** [git sha] (different — production has continued shipping)
- **Day-1 verdict:** [GREEN / YELLOW / RED] (link to day-1 report)
- **Total deploys to main since cutover:** [N]

---

## Cumulative uptime — 30 days

Source: UptimeRobot dashboard (cf-3qt.8.31) export covering `[T = 0]` → `[T+30d]`.

| URL | Uptime % | Total downtime | Notes |
|---|---:|---:|---|
| `/` | [99.x] | [Nm] | |
| `/shop/futon-frames` | [99.x] | [Nm] | |
| `/shop/murphy-cabinet-beds` | [99.x] | [Nm] | |
| `/shop/platform-beds` | [99.x] | [Nm] | |
| `/shop/mattresses` | [99.x] | [Nm] | |
| `/products/kingston-futon-frame` | [99.x] | [Nm] | |
| `/cart` | [99.x] | [Nm] | |
| `/contact` | [99.x] | [Nm] | |
| **Aggregate (mean)** | **[99.x]** | **[Nm]** | |

**Phase 9 target:** ≥ 99.9 % aggregate (per cutover-verification-matrix monitoring threshold). Anything < 99.5 % blocks Phase 9.

---

## Error trend — week-over-week

Source: Vercel logs + Sentry, summed per week. The trend matters more than the absolute count.

| Week | 5xx count | Sentry errors | Wix Headless errors | Trend |
|---|---:|---:|---:|---|
| Week 1 (T+0 → T+7d) | [N] | [N] | [N] | baseline (cutover noise expected) |
| Week 2 (T+7d → T+14d) | [N] | [N] | [N] | should be ≤ Week 1 |
| Week 3 (T+14d → T+21d) | [N] | [N] | [N] | should be ≤ Week 2 |
| Week 4 (T+21d → T+30d) | [N] | [N] | [N] | should match Week 3 (steady-state) |

**Phase 9 signal:** Week 4 ≤ Week 1 across all three columns. A non-monotonic pattern (e.g. Week 4 spikes vs. Week 3) is a YELLOW flag.

---

## Order rate — 30-day

Source: Wix Stores admin export + the pre-cutover baseline at `docs/cf-3qt.8/order-baseline-<DATE>.{json,md}`.

| Metric | 14-day pre-cutover | Days 1–7 post | Days 8–14 post | Days 15–21 post | Days 22–30 post |
|---|---:|---:|---:|---:|---:|
| Daily order count (mean) | [N] | [N] | [N] | [N] | [N] |
| Daily order value (mean $) | [$N] | [$N] | [$N] | [$N] | [$N] |
| Average order value ($) | [$N] | [$N] | [$N] | [$N] | [$N] |
| Conversion rate (orders / sessions) | [x %] | [x %] | [x %] | [x %] | [x %] |

**Phase 9 target:**
- Daily order count: ≥ 90 % of pre-cutover 14-day mean by Days 15–21
- Conversion rate: within ± 15 % of pre-cutover baseline by Days 22–30

A persistent shortfall (e.g. orders down 40 % across all four weeks) is a 🔴 finding even if uptime is green — the funnel is broken somewhere we haven't detected.

---

## RUM (Real-User Performance) — week-over-week

Source: Vercel Web Vitals dashboard (the cutover deploy made these signals live).

| Page | Pre-cutover Lighthouse LCP | Wk-1 RUM LCP p75 | Wk-2 | Wk-3 | Wk-4 | Δ vs baseline |
|---|---:|---:|---:|---:|---:|---:|
| `/` | [Nms] | [Nms] | [Nms] | [Nms] | [Nms] | [+/−x %] |
| `/shop/futon-frames` | [Nms] | [Nms] | [Nms] | [Nms] | [Nms] | [+/−x %] |
| `/products/kingston-futon-frame` | [Nms] | [Nms] | [Nms] | [Nms] | [Nms] | [+/−x %] |
| `/cart` | [Nms] | [Nms] | [Nms] | [Nms] | [Nms] | [+/−x %] |
| `/design-a-room` | [Nms] | [Nms] | [Nms] | [Nms] | [Nms] | [+/−x %] |

Repeat for INP and CLS.

**Phase 9 target:**
- LCP p75 ≤ 2500 ms across all key pages (Core Web Vitals "Good")
- INP p75 ≤ 200 ms
- CLS p75 ≤ 0.1
- Δ from pre-cutover baseline within ± 10 % per metric per page

---

## All P0 / P1 incidents — 30-day

Chronological list. Reference incident beads.

| Date | Severity | Description | Resolution time | Bead |
|---|---|---|---:|---|
| [YYYY-MM-DD] | [P0/P1] | [brief] | [Nm] | [cf-?] |

If empty: write "(no P0/P1 incidents in the 30-day window)". This is the **strongest single signal** for GREEN.

---

## Recurring patterns

Anything that happened more than once in the 30-day window and shares a root cause. Each row gets a hardening bead.

| Pattern | Occurrences | Root cause | Bead |
|---|---:|---|---|
| [item — e.g. "intermittent 502 on /search during high-traffic windows"] | [N] | [item] | [cf-?] |

If empty: "(no recurring patterns)".

---

## Customer support volume

Source: support inbox + Wix Studio dashboard messages + social DMs, weekly tally.

| Week | Tickets | "Site is broken" tickets | Site-related % |
|---|---:|---:|---:|
| Week -2 (pre-cutover) | [N] | [N] | [x %] |
| Week -1 (pre-cutover) | [N] | [N] | [x %] |
| Week 1 (post) | [N] | [N] | [x %] |
| Week 2 | [N] | [N] | [x %] |
| Week 3 | [N] | [N] | [x %] |
| Week 4 | [N] | [N] | [x %] |

**Phase 9 target:** Week 4 site-related ticket count and % within pre-cutover baseline.

---

## Search Console index coverage

Source: Search Console → Coverage report, weekly snapshots.

| Week | Indexed | Excluded — soft 404 | Excluded — server error | Excluded — duplicate | Total submitted |
|---|---:|---:|---:|---:|---:|
| Week 1 | [N] | [N] | [N] | [N] | [N] |
| Week 2 | [N] | [N] | [N] | [N] | [N] |
| Week 3 | [N] | [N] | [N] | [N] | [N] |
| Week 4 | [N] | [N] | [N] | [N] | [N] |

**Phase 9 target:** Indexed count ≥ pre-cutover baseline by Week 4 (re-indexing typically completes in 14–28 days for a 100-URL site).

---

## Wix Stores ↔ Vercel divergence (cart-session dual-write health)

The `notifyCartSessionUpdate` fire-and-forget helper (cf-cart-session-dual-write) keeps Wix Stores cart sessions in sync with cfw. Confirm no divergence over the 30-day window:

| Metric | Wix Stores admin | cfw analytics | Δ |
|---|---:|---:|---:|
| Cart sessions opened (30d) | [N] | [N] | [x %] |
| Carts converted to orders | [N] | [N] | [x %] |
| Cart abandonment count | [N] | [N] | [x %] |

A persistent > 5 % delta indicates the dual-write is silently dropping events; file as a hardening bead.

---

## Outstanding regressions

Anything still unresolved at T+30d. Each becomes a Phase 9.x recovery bead OR is explicitly accepted as residual risk.

| Description | Surface | First seen | Status | Bead |
|---|---|---|---|---|
| [item] | [page/feature] | [YYYY-MM-DD] | [open / accepted / in-progress] | [cf-?] |

If empty: "(none — clean 30-day window)".

---

## Verdict

Pick one:

- 🟢 **GREEN — Proceed to Phase 9.** All 30-day targets met. Wix Studio retirement is unblocked. Phase 9 actions (unpublish, downgrade evaluation, archive) can begin per cf-3qt.9.
- 🟡 **YELLOW — Extend the window.** Mostly green, one or two metrics still drifting. Re-evaluate at T+45d. Wix Studio stays Published.
- 🔴 **RED — Hold Phase 9 indefinitely.** Material instability still present. File hardening beads; revisit when their fix lands.

**Verdict chosen:** [GREEN / YELLOW / RED]

### Verdict rationale

[Paragraph or three explaining the verdict. Reference specific table rows above. If GREEN, name the strongest evidence. If YELLOW/RED, name what's missing and the trigger for re-evaluation.]

---

## Phase 9 unlock checklist (only relevant if Verdict = GREEN)

These are the 5 cf-3qt.9 acceptance gates. Tick each before kicking off Phase 9 actions:

- [ ] Stilgar + mayor read this report and signed off
- [ ] Wix Studio still publishable (verify by re-publishing a no-op edit; revert if anything fails)
- [ ] Velo backend runs independently of Wix Studio editor (Wix Premium plan covers Velo regardless of editor visibility — confirm with Wix support before downgrade)
- [ ] Hookup guide archive plan: `EDITOR_HOOKUP_GUIDE.html` + `.md` get a "RETIRED" banner pointing at cf-3qt
- [ ] Retrospective scheduled (postmortem template at `cf-3qt-cutover-postmortem-TEMPLATE.md`)
- [ ] `v-wix-studio-retired` tag plan agreed for both repos

If all 6 are checked, Phase 9 actions (cf-3qt.9 Steps 2–7) execute on the agreed schedule.

---

## Lessons learned (30-day perspective)

Free-form. Day-1 captured the cutover-window lessons; the 30-day window captures the *operational* lessons — what does running cfw in production actually look like vs. what we expected?

- [observation 1]
- [observation 2]
- [observation 3]

Examples to prompt:
- "Vercel build credit consumption settled at [N]/week; cf-ukc6 conservation rules can [relax / tighten]"
- "Wix Headless API quota is [Nx headroom / approaching limit]"
- "Search Console flagged [N] crawl errors over 30 days; pattern is [...]"
- "Sentry alert thresholds need adjusting because [...]"

These feed the cfw operational playbook and post-mortem.

---

## Sign-offs

- [ ] Stilgar — read + acknowledged
- [ ] mayor — read + acknowledged
- [ ] melania (PM) — author

---

## Refs

- Bead: cf-tqwn (this template)
- Day-1 sibling: [`cf-3qt-day1-stability-report-TEMPLATE.md`](./cf-3qt-day1-stability-report-TEMPLATE.md)
- Cutover playbook: cfutons `docs/cf-3qt-cutover-night-checklist.md` + cfw [`cf-3qt-cutover-night-checklist.md`](./cf-3qt-cutover-night-checklist.md)
- Rollback playbook: [`cf-3qt-rollback-runbook.md`](./cf-3qt-rollback-runbook.md)
- Post-mortem template: [`cf-3qt-cutover-postmortem-TEMPLATE.md`](./cf-3qt-cutover-postmortem-TEMPLATE.md)
- Order baseline source: cfutons `docs/cf-3qt.8/order-baseline-runbook.md` + the captured `order-baseline-<DATE>.{json,md}`
- Phase 8 master: cf-3qt.8 · **Phase 9 retirement: cf-3qt.9 (this report gates)**
