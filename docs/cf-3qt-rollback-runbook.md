# cf-3qt Phase 8 — Cutover Rollback Runbook

> **Bead:** cf-4f6l · **Sibling docs:** [`docs/vercel-domain-setup.md`](./vercel-domain-setup.md) (forward path), [`scripts/pre-cutover-monitor.sh`](../scripts/pre-cutover-monitor.sh), [`scripts/post-cutover-smoke.sh`](../scripts/post-cutover-smoke.sh)
>
> Owner: Stilgar (executes) · Coordinator: melania (PM) · Pager: mayor + crew on-call

The forward runbook tells you how to flip DNS to Vercel. **This document tells you how to flip it back to Wix Studio if cutover fails.** Read it once before cutover night so the plays are familiar; keep it open in a second tab during the cutover window.

---

## TL;DR

> **Rollback = change DNS back. Wix Studio site is preserved (do not unpublish until Phase 9, 30 days post-cutover). Vercel deployment is not deleted. The revert is a DNS edit, propagation wait, smoke verify.**

```
Decision (5 min) → DNS revert (10 min) → propagation (TTL window) →
  Wix-side smoke (15 min) → comms (parallel) → re-attempt gate
```

End state after a successful rollback:
- `carolinafutons.com` and `www.carolinafutons.com` resolve to Wix Studio again
- The cfw Vercel deployment is still live at its `*.vercel.app` URL (not customer-facing)
- A post-rollback diagnostic doc captures *why*, so the next cutover attempt closes the gap

---

## Decision matrix — when to roll back

Don't roll back reflexively. Most issues fall into a **forward-fix** category. Use the table below; if a single line says ROLL BACK, roll back.

| Failure mode | Action | Rationale |
|---|---|---|
| `post-cutover-smoke.sh` exits 1 (DNS) | wait 15 min, re-run; ROLL BACK if still 1 after 30 min | DNS propagation can take several minutes; rollback DNS will take just as long, so wait for the original to clear before flipping back |
| `post-cutover-smoke.sh` exits 2 (PLP returns Wix markers) | wait 15 min for cache; ROLL BACK if persistent | Vercel may be serving a stale build; one redeploy + wait often resolves |
| `post-cutover-smoke.sh` exits 3 (Wix Headless OAuth) | **ROLL BACK** | client-id misconfig in Vercel env — every cart/PDP path on cfw is broken; forward-fix requires a redeploy and re-test, slower than rolling back |
| `post-cutover-smoke.sh` exits 4 (cart round-trip) | wait 5 min, re-run; ROLL BACK if persistent | could be a transient Wix Headless 5xx; brief retry first |
| `pre-cutover-monitor.sh` shows >5 % 5xx on any critical path for >10 min | **ROLL BACK** | sustained 5xx is customer-impacting and rarely fixes itself |
| Lighthouse LCP regression >2× baseline on PDP for >10 min | forward-fix unless it's >4× | perf is recoverable; only roll back if pages are visually broken |
| Checkout flow broken (cart → Wix Headless redirect fails) | **ROLL BACK** | revenue-critical; forward-fix takes longer than rollback |
| Search Console flags massive index drop (next-day finding) | **DO NOT roll back at this point** — already past the propagation window | file as a Phase 8.x recovery bead with sitemap re-submission |
| Customer support reports a single browser/device issue | forward-fix | not warranting site-wide rollback |

If unsure: ping mayor on the cutover-window pager. Rollback decisions are reversible (re-cutover is the original runbook), but minutes of downtime matter.

---

## Pre-flight (do this BEFORE the cutover)

These steps make the rollback fast if it's needed. Run them in order on the day of cutover, **before** flipping DNS to Vercel.

### P1 — Lower the DNS TTL

The TTL on `carolinafutons.com` and `www.carolinafutons.com` controls how fast a revert propagates. Default Wix DNS TTL is typically 1 hour (3600s). For cutover night, drop to **300 s (5 minutes)** at least 24 hours in advance so the lower TTL has propagated everywhere by the time we need it.

```
# At the registrar (Cloudflare / GoDaddy / Wix Domains — wherever the records live):
1. Log in to the DNS registrar
2. Edit the apex A record + www CNAME
3. Set TTL = 300 seconds
4. Save
5. Verify with `dig +noall +answer carolinafutons.com` — should show TTL near 300
```

Restore TTL to 3600 after Phase 8 stability is confirmed (Phase 9 prep).

### P2 — Snapshot the current Wix Studio DNS targets

Record the values you're about to overwrite, so the rollback step is a literal copy-paste.

```
$ dig +short carolinafutons.com           # Wix's A record(s)
$ dig +short www.carolinafutons.com       # Wix's CNAME (e.g. *.wixdns.net)
```

Save the output to a file you can find at 2 AM:

```
~/cfw-cutover-dns-snapshot-$(date +%Y%m%d).txt
```

The snapshot is the **source of truth for rollback**. Don't trust memory.

### P3 — Confirm Wix Studio is still published

The forward runbook does NOT unpublish the Wix Studio site (per `cf-3qt.9` — that's a Phase 9 step, 30 days later). Verify before cutover:

1. Log in to Wix Studio dashboard.
2. Confirm the site is in **Published** state, NOT Draft.
3. Confirm `https://<wix-staging-url>` (the `*.wixsite.com` or similar Wix-default URL) renders the live site, not a "Site not published" page.

If Wix Studio is unpublished or in draft state, you cannot roll back via DNS — re-publish it first.

### P4 — Capture a Vercel deployment ID for forensics

If we roll back, we'll want to know exactly which Vercel deploy was live at the time. Run:

```
$ vercel inspect carolina-futons-web --token=$VERCEL_TOKEN | grep -E 'id|url|created'
```

Save to the same snapshot file so the post-mortem has the deploy SHA.

---

## Rollback execution

### Step 1 — Take the call (≤5 min)

Decision-maker: Stilgar (or melania if Stilgar is asleep). Read the decision matrix above. If the answer is ROLL BACK, say it out loud / type it in the cutover-window channel so the timeline is logged.

```
[2:13 AM] STILGAR: ROLL BACK — post-cutover-smoke exit code 3
[2:13 AM] STILGAR: starting DNS revert per cf-4f6l
```

### Step 2 — Revert DNS records (10 min)

At the DNS registrar:

1. Find the apex A record for `carolinafutons.com`. Replace the Vercel IP(s) with the Wix A record(s) from the **P2 snapshot**.
2. Find the CNAME for `www.carolinafutons.com`. Replace the Vercel target with the Wix CNAME (e.g. `something.wixdns.net`) from the snapshot.
3. Keep TTL = 300 s.
4. Save.

**Do NOT** delete the Vercel `vercel-dns.com` records elsewhere (e.g. AAAA / additional records) — leaving them present is harmless and keeps the configuration ready for re-cutover.

### Step 3 — Wait for propagation (≤TTL window)

```
$ dig +short carolinafutons.com
$ dig +short www.carolinafutons.com
```

Both should now resolve to the Wix targets. With TTL = 300 s, expect propagation in 5–10 min for most consumer ISPs. Use [whatsmydns.net](https://www.whatsmydns.net/) for a global view if a customer reports they're still seeing Vercel.

### Step 4 — Smoke verify (Wix Studio is serving)

The `post-cutover-smoke.sh` is Vercel-shaped (it expects Next.js markers). For Wix-side verification, hit the four checkpoints manually:

```
# DNS
$ dig +short carolinafutons.com           # should be Wix A
$ dig +short www.carolinafutons.com       # should be Wix CNAME

# Home page renders
$ curl -sI https://www.carolinafutons.com | head -1
# expect: HTTP/2 200

# Confirm Wix render (NOT Next.js)
$ curl -s https://www.carolinafutons.com | grep -E '__NEXT_DATA__|wixCode'
# expect: NO __NEXT_DATA__ match, YES wixCode or static.parastorage.com

# A representative shoppable URL still loads
$ curl -sI https://www.carolinafutons.com/futons | head -1
# expect: HTTP/2 200
```

If any of these fail, page mayor immediately. The Wix site should serve in <30 s once DNS resolves; persistent failure means Wix Studio itself is sick (rare, but possible if the publication state was changed mid-cutover).

### Step 5 — Comms (parallel to Step 4)

If the cutover-window outage exceeded **5 minutes**, draft a customer-facing message:

```
Subject: Brief site disruption resolved

We had a brief technical hiccup on carolinafutons.com tonight that
lasted under [N] minutes. The site is fully back to normal. No orders
were affected; if you tried to order during that window and saw an
error, please email us at carolinafutons@gmail.com and we'll make sure
you get the price you expected.

— Brenda, Carolina Futons
```

Only send if outage was customer-noticeable (i.e. >5 min of 5xx or wrong-site rendering on the apex). Send via Wix CRM email blast + post on the Carolina Futons social channels if the outage exceeded 30 minutes.

### Step 6 — Lock the rollback in

After 30 min of green Wix-side smoke:

1. **Restore DNS TTL to 3600 s** at the registrar (no rush; just don't leave it at 300 forever — registrars sometimes flag low-TTL accounts).
2. Capture a post-rollback timeline note in `docs/cf-3qt-cutover-postmortem-<DATE>.md` (sibling doc to this runbook). Include:
   - Decision timestamp
   - DNS revert timestamp
   - First-clean-smoke timestamp
   - Customer-impact estimate (# of 5xx in the window)
   - Vercel deploy SHA at the time of failure (from P4 snapshot)
   - Probable root cause (one paragraph; full RCA can come later)
3. Tag the cfw deploy that failed with a `rolled-back-<DATE>` git tag for forensics:
   ```
   git tag -a rolled-back-2026-MM-DD <SHA> -m "Rolled back during cutover attempt N"
   git push --tags
   ```

---

## Post-rollback — re-attempt gate

A re-attempt of cutover requires:

- [ ] RCA written and reviewed by mayor + Stilgar
- [ ] The specific failure mode that triggered rollback has a regression test in cfw or a documented operational mitigation
- [ ] `post-cutover-smoke.sh` updated if the failure surfaced a check it should have caught
- [ ] At least 24 hours since the rollback (to let cache + RUM data settle)
- [ ] Vercel deploy verified green on the latest main, not the rolled-back SHA
- [ ] DNS TTL re-lowered to 300 s, fresh snapshot captured
- [ ] Stilgar + mayor + on-call crew available for the window

The same forward runbook (`docs/vercel-domain-setup.md`) applies for the re-attempt.

---

## Out of scope

- **Search Console / sitemap recovery** if Google has crawled the Vercel deployment during the failed window — that's a Phase 8.x bead (file `cf-?? cfw: post-rollback Search Console reconcile` if it triggers; index drop typically settles in a week without action).
- **Wix Premium plan rollback** — N/A, the plan is preserved through Phase 9.
- **Cart cookie cleanup for customers who created a cart on the cfw side mid-window** — those carts will be orphaned. Don't try to migrate them; the customer experience is "go re-add to cart on the now-Wix site." Acceptable for a rollback scenario.
- **Vercel project deletion** — never. Keep the project for the re-attempt. Costs are minimal and the project has the env vars + deploy history.

---

## Refs
- Bead: cf-4f6l
- Forward runbook: [`docs/vercel-domain-setup.md`](./vercel-domain-setup.md)
- Pre-cutover monitor: `scripts/pre-cutover-monitor.sh`
- Post-cutover smoke: `scripts/post-cutover-smoke.sh`
- Phase 8 master bead: cf-3qt.8
- Phase 9 retirement: cf-3qt.9 (Wix Studio unpublish — happens 30 days post-stable-cutover, NOT before)
