# cf-3qt Phase 8 — Cutover Post-Mortem TEMPLATE

> **Bead:** cf-5f9o · **For:** the team retrospective after Phase 8 cutover (or rollback) · **Pairs with:** [`cf-3qt-cutover-night-checklist.md`](./cf-3qt-cutover-night-checklist.md), [`cf-3qt-rollback-runbook.md`](./cf-3qt-rollback-runbook.md), [`cf-3qt-day1-stability-report-TEMPLATE.md`](./cf-3qt-day1-stability-report-TEMPLATE.md)
>
> **How to use:** copy this file to `docs/cf-3qt-cutover-postmortem-YYYY-MM-DD.md`, fill the `[BLANK]`s, commit to main. Single template handles both outcomes (success and rollback) — the Outcome banner at the top sets the tone for which sections are most relevant.

---

## Outcome

Pick one. The choice steers which sections matter most:

- 🟢 **SUCCEEDED-CLEAN** — cutover stuck, day-1 was GREEN, no rollback. Post-mortem focuses on what worked + what we got lucky on.
- 🟡 **SUCCEEDED-WITH-CAVEATS** — cutover stuck but day-1 was YELLOW (missed a metric, isolated incidents resolved within window). Post-mortem focuses on the caveats → recovery beads.
- 🔴 **ROLLED-BACK** — DNS reverted to Wix Studio mid-cutover. Post-mortem focuses on the failure mode + re-attempt plan. May be paired with a SUCCEEDED post-mortem from the next attempt.

**Outcome chosen for this report:** `[GREEN | YELLOW | RED]`

---

## Header

| Field | Value |
|---|---|
| Cutover date | [YYYY-MM-DD] |
| Attempt # | [1, 2, …] (increment on re-attempts after rollback) |
| Cutover engineer | [Stilgar / mayor] |
| PM | melania |
| Vercel deploy SHA at T = 0 | [sha] |
| cfw branch tag | `cutover-[YYYY-MM-DD]-attempt-[N]` |
| Rollback occurred? | [yes / no] |
| Time-to-rollback (if applicable) | [Nm] from T = 0 to DNS revert started |
| Day-1 stability verdict | [link to day-1 report] |

---

## Timeline (verbatim)

Pulled from the cutover-window log + monitor + Vercel + Wix Stores admin.

| Time (UTC) | Event | Source |
|---|---|---|
| [T-24h HH:MM] | DNS TTL lowered to 300 s | cutover-window-channel |
| [T-2h HH:MM] | Final go/no-go: GO | cutover-window-channel |
| [T-30m HH:MM] | Vercel domain + SSL verified | dashboard |
| [T = 0] | DNS records flipped | registrar |
| … | … | … |

**Total cutover-window length** (from T = 0 to "monitor green for 1h" / "rollback complete"): [Nh Nm].

---

## Decision tree replay

Walk every go/no-go decision in the cutover window. For each, document: what was the call, what was the evidence in front of the decider, what would change the call next time.

### Decision 1 — `[name, e.g. "T-2h GO/NO-GO"]`

- **Call:** [GO / HOLD / ROLLBACK]
- **Evidence at the moment:** [bullet list]
- **Time-to-decide:** [Nm]
- **Confidence (1–5):** [N]
- **Retrospective:** would you make the same call with what you know now? [yes / no, why]
- **Action item if any:** [link to bead]

### Decision 2 — `[name]`

[same shape]

[repeat for each go/no-go]

---

## Incident replay (P0 / P1)

For each P0/P1 from the day-1 report, do a 5-whys.

### Incident 1 — `[brief title]`

**Severity:** [P0 / P1]
**Detected at:** [T+Nm]
**Resolved at:** [T+Nm]
**Customer impact:** [N orders affected / Ns of 5xx / etc.]

**5-whys:**
1. Why did it happen? [...]
2. Why did that root cause exist? [...]
3. Why did our pre-cutover checks miss it? [...]
4. Why was the resolution not faster? [...]
5. Why isn't there an automated guard against this class? [...]

**Root cause** (one sentence): [...]

**Recovery bead:** [cf-?]

**Pre-cutover signal that should have caught it** (e.g. "post-cutover-smoke step N could have detected this if it checked X"): [...]

[repeat for each P0/P1]

If no P0/P1 incidents: write "(no P0/P1 incidents — see day-1 report for the full clean run)".

---

## What worked

Free-form bullet list. Lead with the surprises — things that worked better than expected are as informative as failures.

- [item]
- [item]
- [item]

Examples to prompt:
- "post-cutover-smoke caught a misconfig within 90s — pattern is reusable"
- "pre-cutover-monitor's 60s sweep was the right cadence — caught a 5xx tail at T+12m"
- "rollback runbook's TTL pre-flight saved [Nm] vs default propagation"
- "Stilgar's Wix Studio publish-check at T-24h prevented a rollback gap"

## What didn't work

Categorize: process / tooling / assumption / coordination.

### Process
- [item]

### Tooling
- [item]

### Assumption
- [item that we assumed would be fine but wasn't]

### Coordination
- [item — comms, hand-offs, on-call]

## What we got lucky on

The "we should not rely on this" list. Things that worked because the universe smiled, not because we engineered it.

- [item]
- [item]

Examples to prompt: "we got lucky that traffic was low at the cutover window", "we got lucky that the only Wix-side failure had a fast manual workaround", "we got lucky that no edge ISP was caching aggressively".

These items become future hardening beads.

---

## Action items

Every gap identified above maps to an action item. Each action item is a bead.

| # | Action | Owner | Priority | Bead |
|---|---|---|---|---|
| 1 | [item] | [who] | [P?] | [cf-?] |
| 2 | [item] | [who] | [P?] | [cf-?] |

If the post-mortem produces zero action items, that's a signal — either we ran a perfect cutover (rare) or we didn't dig hard enough. Default to "produce ≥ 3 action items" even on a clean SUCCEEDED-CLEAN outcome; perfection is a hardening invitation, not a finish line.

---

## Forward roadmap updates

Which docs need amending based on what this cutover taught us?

| Doc | Update needed | Bead |
|---|---|---|
| `cf-3qt-cutover-night-checklist.md` | [add step / change wording / etc.] | [cf-?] |
| `cf-3qt-rollback-runbook.md` | [item] | [cf-?] |
| `scripts/post-cutover-smoke.sh` | [add check / loosen threshold / etc.] | [cf-?] |
| `scripts/pre-cutover-monitor.sh` | [add URL / add metric] | [cf-?] |
| `cf-3qt-day1-stability-report-TEMPLATE.md` | [section to add] | [cf-?] |

If the cutover was a re-attempt, this section also includes "what we changed since the previous attempt" so the lineage is preserved.

---

## Re-attempt plan (only if Outcome = ROLLED-BACK)

If we rolled back, the next cutover requires:

- [ ] All "What didn't work" items addressed (or explicitly accepted as residual risk)
- [ ] All P0/P1 5-whys have a regression test or operational mitigation in place
- [ ] `post-cutover-smoke.sh` updated if the failure surfaced a check it should have caught
- [ ] Pre-cutover-monitor URL list updated if the failure surfaced a path not under watch
- [ ] At least 24 hours since the rollback (let cache + RUM data settle)
- [ ] Vercel deploy verified green on the latest main, not the rolled-back SHA
- [ ] DNS TTL re-lowered to 300 s, fresh snapshot captured per `cf-3qt-rollback-runbook.md` P-flight
- [ ] Stilgar + mayor + on-call crew available for the next window

**Tentative re-attempt date:** [YYYY-MM-DD]

---

## Sign-offs

- [ ] Stilgar — read + acknowledged action items
- [ ] mayor — read + acknowledged
- [ ] melania (PM) — author
- [ ] Crew that worked the cutover — read

---

## Refs

- Bead: cf-5f9o (this template)
- Cutover playbook: [`cf-3qt-cutover-night-checklist.md`](./cf-3qt-cutover-night-checklist.md)
- Rollback playbook: [`cf-3qt-rollback-runbook.md`](./cf-3qt-rollback-runbook.md)
- Day-1 report: [`cf-3qt-day1-stability-report-TEMPLATE.md`](./cf-3qt-day1-stability-report-TEMPLATE.md)
- Forward path: [`vercel-domain-setup.md`](./vercel-domain-setup.md)
- Pre-cutover Lighthouse baseline: `lighthouse-pre-cutover-2026-05-05.md`
- Phase 8 master: cf-3qt.8
- Phase 9 retirement: cf-3qt.9 (gated on 30 days of post-cutover stability)
