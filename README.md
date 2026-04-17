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
      revalidate/
        route.ts      # Wix CMS webhook -> revalidateTag (HMAC verified)
    smoke/page.tsx    # SDK integration smoke test
    layout.tsx        # Root layout
    page.tsx          # Homepage (placeholder)
  components/ui/      # shadcn/ui components
  lib/
    wix-client.ts     # Wix SDK client factory
    utils.ts          # Tailwind merge utilities
e2e/                  # Playwright e2e tests
.github/workflows/    # CI pipeline
```
