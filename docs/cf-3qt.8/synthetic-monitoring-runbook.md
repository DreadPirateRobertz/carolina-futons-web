# cf-3qt.8 — Synthetic monitoring runbook

**Bead:** cf-3qt.8.30
**Author:** godfrey · 2026-05-10
**Purpose:** External liveness checks for the 10 critical URLs that must stay green during and after the cf-3qt.8 DNS cutover.

> **Status fields below marked `<TBD>` require Stilgar to complete the
> external setup** (UptimeRobot account creation, alert routing). The
> `/api/health` Vercel endpoint and the URL list are the engineering
> deliverable; the monitoring service config is the ops deliverable.

---

## 1. Endpoint contract — `/api/health`

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/api/health` |
| Auth | None (public, `dynamic = "force-dynamic"` so it never caches) |
| Status | `200` always (or 5xx if Vercel itself is failing) |
| Body | `{ "status": "ok", "ts": "<ISO 8601>", "env": "<env-name>" }` |
| Response time SLO | < 500 ms p95 from the monitoring region |

**Notes:**
- The endpoint is intentionally minimal. A 200 here proves only that the Vercel deployment is up and serving routes. It does NOT prove Wix Stores reachability, cart flows, or DB writes — those are covered by the cf-3qt.8 smoke playbook.
- `env` reports `VERCEL_ENV` (`production` / `preview` / `development`) when set, falling back to `NODE_ENV`, then `"unknown"`. UptimeRobot can check the body for `"env":"production"` to ensure it's pointing at prod, not a stale preview.

**Verification:**
```bash
curl -sS https://carolinafutons.com/api/health | jq .
# expected: { "status": "ok", "ts": "2026-05-...", "env": "production" }
```

---

## 2. Critical URLs to monitor

Ordered by traffic priority. All must return 2xx.

| # | URL | Type | What breaks if down |
|---|---|---|---|
| 1 | https://carolinafutons.com/ | home | revenue funnel entry |
| 2 | https://carolinafutons.com/shop/futon-frames | PLP | top-funnel category |
| 3 | https://carolinafutons.com/shop/futon-frames/kingston-futon-frame | PDP | hero product |
| 4 | https://carolinafutons.com/shop/mattresses | PLP | second-largest category |
| 5 | https://carolinafutons.com/shop/murphy-cabinet-beds | PLP | premium category |
| 6 | https://carolinafutons.com/cart | cart | conversion path |
| 7 | https://carolinafutons.com/about | about | nav + SEO |
| 8 | https://carolinafutons.com/contact | contact | nav + lead form |
| 9 | https://carolinafutons.com/api/health | liveness | Vercel runtime liveness (this doc's endpoint) |
| 10 | https://carolinafutons.com/search | search | site-search nav |

> If any URL above is renamed during cf-3qt.8 work, **update the monitor BEFORE merging the rename PR**. A 24-hour false-positive alert burnout is worse than a brief monitoring gap.

---

## 3. Monitoring service config

### 3.1 Service choice

| Option | Free tier | Interval | Why |
|---|---|---|---|
| **UptimeRobot** *(default)* | 50 monitors | 5 min | Account already exists at `carolinafutons@gmail.com`; well-supported Discord webhook |
| Better Uptime | 10 monitors | 3 min | Marginally better UX; only if UptimeRobot's 5-min cadence is too coarse |
| Paid UptimeRobot Pro | 50 monitors | 60 s | Required for the bead's 60-second cadence; ~$7/mo |

**Decision:** start on UptimeRobot Free at 5-min intervals. Upgrade to Pro for the 24 h immediately surrounding cutover (`gt schedule` Stilgar to upgrade the day before, downgrade the day after).

### 3.2 UptimeRobot setup checklist

For Stilgar to execute. Each box pins a credential or config; record values in `secrets.env` (NEVER commit).

- [ ] Log in to UptimeRobot at `carolinafutons@gmail.com` (or create the account if it doesn't exist)
- [ ] Confirm 50-monitor free-tier limit not yet exhausted (each URL = 1 monitor)
- [ ] For each URL in §2 create a monitor:
  - **Type:** HTTPS keyword (search for `"status":"ok"` on URL #9, `<title>` text on #1–#8 + #10)
  - **Interval:** 5 min (free tier) or 60 s (Pro, during cutover window)
  - **Timeout:** 30 s
  - **HTTP method:** GET
  - **Alert when:** "down" (default — no need for "up" notifications)
- [ ] Naming convention: `cf-prod-<short-name>` (e.g. `cf-prod-home`, `cf-prod-pdp-kingston`, `cf-prod-api-health`) — the prefix lets us filter in the dashboard.
- [ ] Save monitor IDs and dashboard URL to `secrets.env`:
  ```
  CF_UPTIMEROBOT_DASHBOARD_URL=<TBD>
  CF_UPTIMEROBOT_MONITOR_IDS={"home":"<TBD>","frames-plp":"<TBD>",...}
  CF_UPTIMEROBOT_API_KEY=<TBD>   # if needed for cross-checks
  ```

### 3.3 Discord webhook config

Channel ID per bead: `1484990638930788352` (Stilgar's #cf-prod-alerts channel).

- [ ] In Discord: channel settings → Integrations → Webhooks → New Webhook → name `UptimeRobot Alerts`. Copy webhook URL.
- [ ] In UptimeRobot: My Settings → Add Alert Contact → Type "Webhook" → paste the Discord URL → Apply.
- [ ] Test: temporarily point one monitor at `https://carolinafutons.com/this-route-does-not-exist-cf-3qt-8-30-test` → confirm Discord receives an alert within the interval → restore the monitor's correct URL.
- [ ] Save webhook URL and contact ID to `secrets.env`:
  ```
  CF_DISCORD_WEBHOOK_URL=<TBD>
  CF_UPTIMEROBOT_ALERT_CONTACT_ID=<TBD>
  ```

### 3.4 Email alert config

Backup channel for if Discord webhook itself fails.

- [ ] In UptimeRobot: My Settings → Add Alert Contact → Type "E-mail" → `carolinafutons@gmail.com`
- [ ] Verify the address from the confirmation email
- [ ] Attach this contact to all 10 monitors (alongside the Discord contact)

---

## 4. Verification checklist

Run all of these BEFORE handing off to ops as "monitoring active":

- [ ] `curl https://carolinafutons.com/api/health` returns 200 + `{"status":"ok",...}`
- [ ] All 10 monitors visible in UptimeRobot dashboard, all green
- [ ] Test alert (§3.3) fired within the configured interval and reached the Discord channel
- [ ] Test email alert reached `carolinafutons@gmail.com` inbox
- [ ] Dashboard URL + monitor IDs recorded in `secrets.env`
- [ ] cf-3qt.8 bead updated with monitoring-active timestamp + dashboard link

---

## 5. Operational handover

- **Page-out triggers:** any of the 10 URLs returning non-2xx for ≥ 2 consecutive checks → Discord alert fires → Stilgar paged. Backup: email.
- **Maintenance windows:** to silence alerts during a known deploy or DNS change, pause the relevant monitor(s) in UptimeRobot. Resume immediately after.
- **Rotation:** if `carolinafutons@gmail.com` ownership changes, update the UptimeRobot account email AND the alert-contact email. Discord webhook is independent.
- **Escalation:** if alerts fire but no real outage is observed via direct browser test, suspect (a) UptimeRobot region-specific routing issue OR (b) keyword check matching a stale rendered fragment. Investigate before silencing.

---

## 6. Linked beads

- **Parent:** cf-3qt.8 (DNS cutover — Vercel Pro + point carolinafutons.com + 24 h monitor)
- **Sibling acceptance items:**
  - cf-3qt.8 acceptance §1 (24 h Vercel-served stability)
  - cf-3qt.8 acceptance §5 (order-rate baseline — separate bead, b63ec4d7)
- **Future:** cf-3qt.9 retirement checklist references this monitoring as part of its 30-day stability gate.
