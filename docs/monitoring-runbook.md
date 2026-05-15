# Monitoring runbook — `/api/health` + UptimeRobot

**Bead:** cf-x6ph (cf-3qt.8 cutover gate)
**Author:** godfrey · 2026-05-10
**Audience:** Stilgar (UptimeRobot account owner), ops, on-call

This document is the single source of truth for the cfw liveness probe + the UptimeRobot configuration that consumes it. Update this file when the endpoint contract changes — `tests/__tests__/api-health-route.test.ts` pins the contract in code.

---

## 1. Endpoint contract — `/api/health`

| Field | Value |
|---|---|
| Method | `GET` |
| Production path | `https://www.carolinafutons.com/api/health` *(post-cutover)* |
| Pre-cutover preview | `https://carolina-futons-web-git-<branch>-dreadpiraterobertzs-projects.vercel.app/api/health` |
| Auth | None — public, no headers required |
| Caching | `Cache-Control: no-store` set on the response; route also `dynamic = "force-dynamic"` so Next.js never serves a cached body |
| Status | `200` always (when the runtime is up). 5xx = real Vercel/Next.js failure |
| Response time SLO | `< 500 ms` p95 from the monitoring region |

**Response body schema:**

```json
{
  "status":    "ok",
  "timestamp": "2026-05-10T08:30:00.000Z",
  "version":   "<git sha or package version>"
}
```

| Field | Type | Source | Notes |
|---|---|---|---|
| `status` | `string` literal `"ok"` | constant | Used by UptimeRobot keyword check |
| `timestamp` | ISO-8601 UTC | `new Date().toISOString()` at request time | Round-trip diagnostic; useful for confirming we're hitting the latest deploy, not a cached edge |
| `version` | `string` | `VERCEL_GIT_COMMIT_SHA` → `npm_package_version` → `"unknown"` | Identifies which deploy answered the probe |

**Verification:**

```bash
curl -sS https://www.carolinafutons.com/api/health | jq .
# expected: { "status": "ok", "timestamp": "2026-05-...Z", "version": "<sha>" }

curl -sI https://www.carolinafutons.com/api/health \
  | grep -iE 'cache-control|content-type|^HTTP'
# expected:
#   HTTP/2 200
#   content-type: application/json
#   cache-control: no-store
```

**Scope of the probe:** A 200 response proves Vercel + Next.js are serving routes. It does NOT prove Wix Stores reachability, cart flows, DB writes, or email delivery. Those belong to the cf-3qt.8 smoke playbook (separate doc).

---

## 2. UptimeRobot configuration

> Account creation + API-key generation is gated on Stilgar (Cloudflare Turnstile blocks headless signup). This section documents the target config so the activation step (cf-3qt.8.31) is mechanical.

### 2.1 Monitor settings

| Setting | Value |
|---|---|
| Type | HTTPS keyword |
| URL | `https://www.carolinafutons.com/api/health` *(post-cutover)* — pre-cutover, point at the latest preview URL on the cf-x6ph PR |
| Keyword | `ok` (matches `"status":"ok"` substring) |
| Keyword type | "exists" — alert when the keyword is **missing** from the response body |
| Interval | **5 min** (UptimeRobot Free tier minimum) |
| Timeout | 30 s |
| HTTP method | GET |
| Friendly name | `cf-prod-api-health` |

### 2.2 Alert thresholds

- **Down trigger:** 2 consecutive failures (10 minutes total at 5-min interval).
  - Avoids single-flap alerts from transient Vercel cold-starts.
  - Documented for Stilgar on the UptimeRobot **Alert Contacts** screen.
- **Up notification:** enabled — confirms recovery during incidents.
- **SSL expiry:** enabled — alert 14 days before cert renewal.

### 2.3 Alert routing

Two channels (redundant — Discord webhook + email backup).

| Channel | Destination | Purpose |
|---|---|---|
| Discord webhook | `#cf-prod-alerts` channel ID `1484990638930788352` | Primary — visible to Stilgar in real time |
| Email | `carolinafutons@gmail.com` | Backup if Discord webhook is broken |

Save the configured webhook URL + alert-contact IDs to `secrets.env` under:

```
CF_UPTIMEROBOT_API_KEY=<from Account → Settings → API>
CF_UPTIMEROBOT_DASHBOARD_URL=<from Account home>
CF_UPTIMEROBOT_MONITOR_ID_API_HEALTH=<numeric monitor ID>
CF_UPTIMEROBOT_ALERT_CONTACT_DISCORD=<numeric contact ID>
CF_UPTIMEROBOT_ALERT_CONTACT_EMAIL=<numeric contact ID>
CF_DISCORD_WEBHOOK_URL=<from Discord channel webhook config>
```

**Never commit `secrets.env`.**

### 2.4 Alert end-to-end test

To confirm the full chain (UptimeRobot → keyword check → Discord webhook → channel) is wired, run this one-time test before declaring monitoring active:

1. Edit the `cf-prod-api-health` monitor URL temporarily to `https://www.carolinafutons.com/api/health-does-not-exist`.
2. Wait one full check interval (5 min) plus the 2-failure threshold (10 min total).
3. Confirm an alert message appears in `#cf-prod-alerts`.
4. Confirm an alert email arrives at `carolinafutons@gmail.com`.
5. Restore the monitor URL.
6. Wait one interval and confirm an "Up" recovery message appears.
7. Record timestamps + screenshots in §4 below.

---

## 3. Operations

### 3.1 Cutover-window upgrade

For the 24 h around DNS cutover, upgrade UptimeRobot to **Pro** (~$7/mo) for **60-second intervals** so a regression is caught within ~2 minutes (vs ~10 minutes on Free tier). Downgrade after the 30-day stability window in cf-3qt.9.

### 3.2 Maintenance windows

To silence alerts during a planned deploy or DNS change:

1. UptimeRobot dashboard → Monitors → `cf-prod-api-health` → **Pause**.
2. Run the deploy / DNS change.
3. Verify `/api/health` is back to 200 + correct schema.
4. **Resume** the monitor.

Never edit the monitor URL during maintenance — pause+resume is the safe path.

### 3.3 If a real outage fires

1. Page Stilgar via Discord `#cf-prod-alerts` — already happens automatically.
2. Direct browser test of the URL the monitor reports failed — confirms the failure is real, not a UptimeRobot region issue.
3. Vercel dashboard → check production deploy status.
4. If Vercel is red: roll back via `vercel rollback` to the previous deploy.
5. If Vercel is green but the URL is failing: investigate route handler — `src/app/api/health/route.ts` is the source.
6. Restore service. Wait for monitor to flip green. Record incident in `docs/incidents/`.

### 3.4 Schema-change protocol

To change the `/api/health` response shape:

1. Update `src/app/api/health/route.ts`.
2. Update `src/__tests__/api-health-route.test.ts` (the schema-shape test will fail loudly if a key is added or removed).
3. Update §1 of this doc.
4. If the keyword check in UptimeRobot needs adjusting, update the monitor in the same change-window so the alert doesn't flap.
5. Consider whether existing monitoring tooling depends on the old shape — search `secrets.env` and any other monitoring repos.

---

## 4. Activation log

| Date | Action | Executed by | Notes |
|---|---|---|---|
| 2026-05-10 | `/api/health` route + tests + this runbook shipped | godfrey | cf-x6ph |
| — | UptimeRobot account created | Stilgar | cf-3qt.8.31 — gated on Stilgar (Turnstile) |
| — | API key recorded in secrets.env | — | — |
| — | `cf-prod-api-health` monitor created | — | record monitor ID |
| — | Discord webhook + email contacts attached | — | — |
| — | End-to-end alert test passed (§2.4) | — | record timestamps |
| — | Pro-tier upgrade for cutover window | — | ~24 h before DNS flip |
| — | Pro-tier downgrade post-stability | — | after cf-3qt.9 30-day window |

---

## 5. Linked beads

- **Parent:** cf-3qt.8 (DNS cutover — Vercel Pro + carolinafutons.com flip)
- **This bead:** cf-x6ph (verify /api/health + document contract)
- **Activation gate:** cf-3qt.8.31 (UptimeRobot account creation — Stilgar)
- **Stability window:** cf-3qt.9 (30-day post-cutover review + Wix retirement)
