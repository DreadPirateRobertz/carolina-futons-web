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
# Fill in WIX_CLIENT_ID and WIX_BACKEND_KEY from Vercel/team secrets

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
| `NEXT_PUBLIC_WIX_CLIENT_ID` | Client + Server | Wix Headless OAuth client ID (visitor token) |
| `WIX_BACKEND_KEY` | Server only | Wix backend API key for elevated operations |

## Project Structure

```
src/
  app/
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
