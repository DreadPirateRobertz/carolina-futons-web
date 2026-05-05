# Vercel Custom Domain Setup Runbook

**Bead:** cf-3qt.8.29  
**Gate:** Vercel Pro must be active before adding a custom domain for production traffic.  
See `docs/migration/` for the Vercel Pro upgrade runbook if that step is not yet done.

---

## Overview

This runbook covers adding `carolinafutons.com` and `www.carolinafutons.com` to the
Vercel project, verifying SSL, and configuring the apex-to-www (or www-to-apex) redirect.
Run it on cutover night, immediately after the Vercel Pro upgrade and before the DNS flip.

---

## Prerequisites

- [ ] Vercel Pro account active (Stilgar — dashboard upgrade)
- [ ] Access to the DNS registrar for `carolinafutons.com` (Stilgar)
- [ ] Vercel CLI installed: `npm i -g vercel` or `pnpm add -g vercel`
- [ ] Logged in to the correct Vercel team: `vercel whoami`

---

## Step 1 — Add domains via dashboard

1. Open [https://vercel.com/dashboard](https://vercel.com/dashboard) → select the
   **carolina-futons-web** project.
2. Go to **Settings → Domains**.
3. Click **Add Domain** → enter `carolinafutons.com` → click **Add**.
4. Repeat for `www.carolinafutons.com`.
5. Vercel will show the required DNS records. Leave this tab open for Step 3.

### Expected domain list after this step

| Domain | Status |
|---|---|
| `carolinafutons.com` | Pending DNS |
| `www.carolinafutons.com` | Pending DNS |

---

## Step 2 — Add domains via CLI (alternative / verification)

```bash
# From the carolina-futons-web repo root
vercel domains add carolinafutons.com
vercel domains add www.carolinafutons.com

# Confirm both are attached to the project
vercel domains ls
```

---

## Step 3 — Update DNS records at registrar

Log into the DNS registrar (likely Wix Domains or the external registrar Stilgar uses).

### Records to add / update

| Type | Name | Value | TTL |
|---|---|---|---|
| `A` | `@` (apex) | `76.76.21.21` | 60s |
| `CNAME` | `www` | `cname.vercel-dns.com.` | 60s |

> **Note:** Vercel's apex IP `76.76.21.21` is their Anycast address for A-record projects.
> Always confirm the exact value shown in **Settings → Domains** for your project — it
> may differ if the project is on a different Vercel edge network.

> **TTL:** Set to 60 seconds 48 hours before cutover so propagation is fast on the night.
> Restore to 3600+ after 24h post-cutover monitoring passes.

### If the domain is still pointing at Wix

Wix typically manages DNS internally. You may need to:
1. In Wix dashboard → **Domains → Manage → DNS Records** — delete or override the
   existing `A` and `CNAME` records for `@` and `www`.
2. Add the Vercel records above.

---

## Step 4 — Wait for DNS propagation

```bash
# Poll until the apex resolves to Vercel
watch -n 10 "dig +short carolinafutons.com A"
# Expected: 76.76.21.21

watch -n 10 "dig +short www.carolinafutons.com CNAME"
# Expected: cname.vercel-dns.com.
```

Propagation typically completes in 2–15 minutes with a 60s TTL.
Use [https://dnschecker.org](https://dnschecker.org) to verify global propagation.

---

## Step 5 — Verify SSL / TLS certificate

Vercel provisions a Let's Encrypt certificate automatically once DNS resolves.

```bash
# Wait for the cert to issue (usually < 2 min after DNS propagates)
curl -sI https://carolinafutons.com | head -5
# Expected: HTTP/2 200 (or 308 if redirect is active)

curl -sI https://www.carolinafutons.com | head -5
# Expected: HTTP/2 200

# Confirm certificate issuer
openssl s_client -connect carolinafutons.com:443 -servername carolinafutons.com \
  </dev/null 2>/dev/null | openssl x509 -noout -issuer -dates
# Expected issuer: Let's Encrypt or Vercel's CA
```

If the cert is still provisioning, the dashboard shows **"SSL Certificate Pending"**.
Wait 2–5 minutes and retry. If it stays pending > 10 minutes, check that DNS records
match exactly what Vercel showed in Step 1.

---

## Step 6 — Configure www redirect

### Option A — Apex primary, www redirects to apex (recommended for CF)

In **Settings → Domains**, set `carolinafutons.com` as the **primary domain**.
Vercel will automatically 308-redirect `www.carolinafutons.com` → `carolinafutons.com`.

Verify:

```bash
curl -sI https://www.carolinafutons.com | grep -E "location|HTTP"
# Expected:
#   HTTP/1.1 308 Permanent Redirect
#   location: https://carolinafutons.com/
```

### Option B — www primary, apex redirects to www

Set `www.carolinafutons.com` as the primary domain in the dashboard.
Vercel 308-redirects `carolinafutons.com` → `www.carolinafutons.com`.

> **Decision:** Confirm with Stilgar which canonical form to use before cutover.
> The current Wix site uses `www.carolinafutons.com` as canonical. Matching it avoids
> GSC property re-verification and preserves existing Search Console history.

---

## Step 7 — Smoke test critical URLs on live domain

```bash
BASE=https://carolinafutons.com   # or www — whichever is primary

# Homepage
curl -sI "$BASE/" | grep "HTTP"
# Expected: HTTP/2 200

# Shop PLP
curl -sI "$BASE/shop/futon-frames" | grep "HTTP"
# Expected: HTTP/2 200

# Product page (spot-check)
curl -sI "$BASE/products/kingston-futon-frame" | grep "HTTP"
# Expected: HTTP/2 200

# Cart
curl -sI "$BASE/cart" | grep "HTTP"
# Expected: HTTP/2 200

# Redirect map — old Wix URL pattern
curl -sI "$BASE/store/product/kingston-futon-frame/1234" | grep -E "HTTP|location"
# Expected: 308 → /products/kingston-futon-frame

# No-index removed — robots.txt should allow indexing
curl -s "$BASE/robots.txt" | grep -i "disallow"
# Expected: empty or only /api/ entries — NOT Disallow: /
```

---

## Step 8 — Vercel dashboard final checks

After DNS is live and certs are green:

1. **Settings → Domains** — both domains show ✅ green.
2. **Deployments** — production deployment is the latest `main` build.
3. **Analytics → Web Vitals** — baseline data will start appearing within minutes.
4. **Logs → Runtime** — tail for errors during the first 30 minutes of live traffic.

---

## Rollback

If anything is broken within the first 2 hours:

1. Revert DNS at the registrar (`A` and `CNAME` back to Wix values).
2. TTL is 60s — propagation is fast.
3. Wix Studio site remains publishable for 30 days (do not unpublish until Phase 9).

Full rollback procedure: see `docs/migration/` rollback runbook (cf-3qt.8.4).

---

## Reference — Vercel CLI commands

```bash
vercel domains ls                          # list all domains on the project
vercel domains add <domain>                # attach a domain
vercel domains remove <domain>             # detach a domain
vercel domains inspect <domain>            # show DNS config + cert status
vercel certs ls                            # list SSL certs
vercel certs issue <domain> --challenge-only  # manual cert re-issue if auto fails
```

---

*Owner: millicent (devops) + Stilgar (DNS access). Runbook authored by blaidd (cf-3qt.8.29).*
