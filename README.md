# Carolina Futons — Headless Frontend

Next.js headless frontend for Carolina Futons, powered by the Wix Headless SDK.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **CMS/Backend**: Wix Headless SDK (`@wix/sdk`, `@wix/stores`, `@wix/data`, `@wix/members`)
- **Testing**: Vitest (unit) + Playwright (e2e)
- **Hosting**: Vercel

## Local Development

```bash
# 1. Clone
git clone git@github.com:DreadPirateRobertz/carolina-futons-web.git
cd carolina-futons-web

# 2. Install
npm install

# 3. Configure environment
cp .env.example .env.local
# Fill in WIX_CLIENT_ID_HEADLESS + WIX_BACKEND_KEY from Vercel/team secrets

# 4. Run dev server
npm run dev
# Open http://localhost:3000

# 5. Smoke test route
# Visit http://localhost:3000/smoke to verify Wix SDK connectivity
```

## Testing

```bash
# Unit tests
npx vitest run

# E2E tests (requires dev server or builds first)
npx playwright test

# Typecheck
npx tsc --noEmit

# Lint
npm run lint
```

## Environment Variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `WIX_CLIENT_ID_HEADLESS` | Server only | Wix Headless OAuth client ID (visitor token) |
| `WIX_BACKEND_KEY` | Server only | Wix backend API key for elevated operations |
| `WIX_VELO_SITE_URL` | Server only | Base URL of live Velo site for HTTP function calls (default `https://www.carolinafutons.com`) |
| `WIX_WEBHOOK_SECRET` | Server only | HMAC shared secret used by `/api/revalidate` to verify Wix CMS webhook signatures (`x-wix-signature`, `sha256=<hex>`) |
| `SMTP_HOST` | Server only | SMTP server hostname for the `/contact` form Server Action |
| `SMTP_PORT` | Server only | SMTP port (465 = implicit TLS, 587 = STARTTLS) |
| `SMTP_USER` | Server only | SMTP auth user — also used as the `From:` envelope sender |
| `SMTP_PASS` | Server only | SMTP auth password (app password for Gmail) |
| `GBP_ACCESS_TOKEN` | Server only | OAuth 2.0 bearer token for the Google Business Profile API (scope `business.manage`). Powers `/reviews` + PDP reviews. Refresh out-of-band — tokens expire after ~1h. |
| `GBP_ACCOUNT_ID` | Server only | Bare GBP account ID (the `{id}` from `accounts/{id}`). |
| `GBP_LOCATION_ID` | Server only | Bare GBP location ID (the `{id}` from `locations/{id}`). |

### Google Business Profile reviews — env-setup runbook (cfw-49h)

The reviews surfaces (`/reviews` + PDP `<PdpReviews>` + JSON-LD aggregate) source
their data from the GBP API at request time. Setup steps for a fresh environment:

1. **Provision OAuth credentials** in Google Cloud Console for the Google
   Business Profile project. Enable the *My Business Account Management API*
   and *My Business Business Information API*.
2. **Generate a refresh token** for an account that owns the Carolina Futons
   GBP location (scope: `https://www.googleapis.com/auth/business.manage`).
   Store the refresh token + client ID/secret outside Vercel — they are not
   needed by the storefront, only the access token derived from them is.
3. **Mint an access token** via the OAuth token endpoint and set
   `GBP_ACCESS_TOKEN` on Vercel (Production + Preview). Schedule a refresh
   (Vercel Cron or GitHub Action) before the 1-hour expiry; the storefront
   degrades to an empty state if the token is missing or rejected, so a stale
   token is visible (no silent fallback to fake data).
4. **Look up the account + location IDs** via the Business Information API
   (`accounts.list` → `locations.list`). Set `GBP_ACCOUNT_ID` and
   `GBP_LOCATION_ID` to the bare numeric IDs (not the `accounts/{id}` prefix —
   the fetcher composes the path itself).
5. **Verify locally** by exporting the three vars in `.env.local`, then hitting
   `/reviews` and a PDP. The page should show real GBP reviews. Without the
   vars, dev mode falls back to the fixture pool in
   `src/lib/discovery/reviews.ts` so the layout is still exercisable.
6. **Verify in CI** with `npx vitest run src/__tests__/google-reviews.test.ts`
   — the fetcher is fully covered by injected-fetch tests, no live API calls.

## Secrets

All secrets listed above must be set in:

1. **Local development** — `.env.local` (git-ignored; copy from `.env.example`)
2. **Vercel project env vars** — https://vercel.com/dreadpiraterobertzs-projects/carolina-futons-web (Development + Preview + Production)
3. **GitHub Actions** — only needed for E2E-against-live-Wix CI runs. Repo Settings → Secrets → Actions (`WIX_CLIENT_ID_HEADLESS`, `WIX_BACKEND_KEY`, `WIX_VELO_SITE_URL`, `WIX_WEBHOOK_SECRET`)

The `/smoke` route degrades gracefully when Wix secrets are absent — missing-env cases surface as per-check FAIL results instead of crashing the page, so CI can still verify the app renders.

The `/api/revalidate` route returns `500` with `WIX_WEBHOOK_SECRET is not configured` when the secret is missing, and `401` for invalid signatures.

## Project Structure

```
src/
  app/
    api/
      revalidate/     # Wix CMS webhook -> revalidateTag (HMAC verified)
      contact/        # 501 stub — blaidd (cf-3qt.4)
      newsletter/     # 501 stub — blaidd (cf-3qt.5)
      delivery-zone/  # 501 stub — godfrey (cf-3qt.2 PDP delivery estimator)
    smoke/page.tsx    # SDK integration smoke test
    layout.tsx        # Root layout with Header/Footer
    page.tsx          # Homepage (placeholder)
  components/
    site/             # Site chrome (Header/Footer placeholders — godfrey fills in cf-3qt.1)
    ui/               # shadcn/ui components
  lib/
    wix-client.ts     # Wix SDK client factory
    wix/              # Thin typed wrappers (products, data, members)
    utils.ts          # Tailwind merge utilities
e2e/                  # Playwright e2e tests
.github/workflows/    # CI pipeline
```
