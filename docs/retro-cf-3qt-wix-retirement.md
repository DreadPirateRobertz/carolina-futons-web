# Retrospective: cf-3qt — Wix Studio Retirement & Next.js Migration

**Status**: Pre-cutover draft — Phase 8/9 rows updated once DNS flips and 30-day window closes
**Owner**: PM sign-off required
**Bead**: cf-3qt.9

---

## What Went Well

**Extremely rapid Phase 0–3 delivery.** The full stack — repo bootstrap, design system, product catalog, cart/checkout, auth, and member dashboard — landed in approximately three days (2026-04-16 to 2026-04-18). This was possible because the scope was locked in beads before a line of code was written.

**Two-site parallel-run strategy held.** Wix Studio remained the live production site throughout the entire build. The new cfw codebase deployed to Vercel preview URLs from day one, allowing real traffic comparison without any customer risk. The cutover is a single DNS flip, not an incremental migration.

**Redirect map landed early.** 301 redirects from every known Wix canonical path (`/product-page/*`, `/futon-frames`, `/contact`, etc.) to cfw routes were wired by 2026-04-25 — three weeks before the cutover runbooks were written. SEO equity transfer is ready.

**Error tracking from the first deploy.** Sentry was wired in Phase 3 (2026-04-17). By the time the Phase 6 performance sprint ran, Sentry had already surfaced a latent cart-session race condition and three categories of Wix SDK soft-failures that were silently swallowed. Finding those in dev rather than post-cutover was the return on early investment.

**Test coverage scaled with the codebase.** The suite grew to 425 test files and ~5,307 tests by the pre-cutover freeze. CI gates enforced by PR template prevented dead-code regressions from sneaking into main.

**Performance sprint was targeted, not speculative.** The 2026-05-09 speed audit identified the top three LCP/TBT regressions before any cutover traffic hit them. The Wix admin SDK tree-shake (~4 MB removed from server bundles), analytics pixel deferral (~400 KiB / ~150 ms TBT improvement on mobile), and image constraint helpers were all shipped before Phase 8.

**Owner-editable CMS layer (cfw-66o) was designed in parallel with the build.** Rather than hardcoding all copy and retrofitting a CMS later, the `getSiteContent()` pattern was established early. By pre-cutover, footer, announcements, home value-props, visit page, shop page, and about page copy are all owner-editable without a deploy.

---

## What Was Hard

**Wix StoreVariant media API shape was underdocumented.** The Wix `queryStoreVariants` API returns a nested shape — `variant.media.mainMedia.image.url` — but early code assumed the flat shape `variant.media.image.url`. This caused PDP hero images to silently fall back to the default product image instead of showing the selected variant's photo. The bug only manifested on deep-link URLs (`?finish=walnut`) so it was not caught by happy-path tests. Root cause: production API responses were not verified against the SDK type signatures.

**`queryStoreVariants` module path changed between SDK versions.** The method was available on both `client.catalog.queryStoreVariants` (older SDK path) and `client.products.queryStoreVariants` (newer path) depending on the installed version. The fix required runtime probing of both paths with a graceful bail.

**ISR vs. `force-dynamic` decision was deferred too long.** The three highest-traffic pages (`/`, `/shop/[category]`, `/products/[slug]`) shipped with `force-dynamic` on the understanding that caching tags would be wired in a later phase. As of pre-cutover, they are still fully dynamic. Every request pays a Wix API round-trip. This is the single largest performance gap vs. the Wix Studio baseline that remains open at cutover.

**Visual parity audit surface area was underestimated.** The 2026-05-09 audit of 8 pages × 3 viewports found that the mobile home experience was effectively broken for first-time visitors: the newsletter modal and cookie consent banner stacked on top of the hero before any content was visible. The gap was not caught in desktop-only review. Playwright-based full-page captures at multiple viewports should have been part of Phase 5 definition of done.

**SiteContent reads were per-request before the cache was added.** `loadSiteContent` used only React `cache()` which dedupes within a single render tree but does not cache across requests. Every page that read CMS copy paid a Wix Data query on every cold request. This was caught and fixed before the cfw-66o rollout expanded beyond `/visit`, but it would have silently added 200–400 ms TTFB to every page once the full cfw-66o wiring landed.

**Coordination overhead for the 5-agent PR review standing order.** The branch protection policy requires five approvals before any merge. For sub-day hotfixes, the approval pipeline was the critical path. The pattern that emerged — post reviewer nudges, then proceed to next task while reviews queue — worked but required deliberate context-switching discipline.

---

## Timeline — Key Milestones

| Phase | Description | Target | Actual |
|-------|-------------|--------|--------|
| 0 | Project kickoff, repo bootstrap | — | 2026-04-16 |
| 1 | Product catalog migration (design system, PLP, PDP, cart drawer) | — | 2026-04-17/18 |
| 2 | Cart & checkout wired (AddToCart, cart reducer, order confirmation) | — | 2026-04-17 |
| 3 | Auth, member dashboard, static pages, CMS collection readers | — | 2026-04-17/18 |
| 4 | SEO parity (OG metadata, sitemap, JSON-LD, 301 redirect map, GA4) | — | 2026-04-25 |
| 5 | Visual parity audit sign-off (8 pages × 3 viewports) | — | 2026-05-09 (audit) / 2026-05-15 (gaps closed) |
| 6 | Performance baseline — LCP/TBT/CLS sprint | — | 2026-05-09 |
| 7 | Analytics & SEO confirmed live on preview URL | — | 2026-05-15 |
| 8 | DNS cutover — carolinafutons.com → Vercel | — | TBD |
| 9 | Wix Studio retired, 30-day stability confirmed | — | TBD (Day 30 post Phase 8) |

---

## Lessons

**Verify Wix API response shapes empirically before writing business logic.** The SDK type signatures are sometimes ahead of or behind the actual production API behavior. Write a one-off integration test against the live sandbox that logs the full response shape before reading into it. The PDP variant-image bug would have been caught in an hour if that check existed.

**ISR vs. `force-dynamic` is a Phase 0 architectural decision.** Choosing "dynamic for now, cache later" creates a technical debt that compounds across every page as traffic grows. The correct default for an e-commerce catalog is ISR with explicit cache tag invalidation on Wix product-change webhooks. Wiring the webhooks from the start costs less than retrofitting ISR across 50+ routes.

**Mobile-first QA with Playwright full-page captures at every phase gate.** The visual parity gap was invisible in desktop review because the consent/newsletter overlay only stacked destructively at mobile viewports. Playwright captures at 375/768/1280 should be a required artifact at every visual milestone.

**Seed CMS rows in the same PR that wires `getSiteContent`.** Three features shipped with `getSiteContent` calls but no corresponding seed rows: home value-props (cfw-34q closed the gap), visit page (cfw-roi), and about page (cfw-66o.11). In each case Brenda had no initial row to edit — she would have seen the hardcoded fallback silently. The rule is: if you wire a key, you seed the row.

**`react/cache()` is render-tree deduplication, not request-level caching.** For any CMS or API read that is shared across pages, use `unstable_cache` (Next.js) with an appropriate TTL. `cache()` alone will silently miss on every cold request in a serverless environment.

---

## Recommendations for Future Migrations

**Wix-to-Next.js migration playbook — start with API shape contracts.**
Before writing any rendering layer, write a thin script that calls the 5–10 most-used Wix SDK methods and logs the full response shape. Treat those logs as the ground truth, not the TypeScript types. This catches nested-vs-flat mismatches (StoreVariant media), pagination contract differences (`data.items` vs `items`), and soft-failure shapes (`{ success: false, message: "..." }` vs thrown error) before they reach production.

**Two-site parallel run is worth the overhead.**
Running cfw on preview URLs while Wix Studio stays live removed the most dangerous class of cutover risk: "the new site broke something we didn't know about." The cost is maintaining two deployments for several months. The benefit is that the cutover is a reversible DNS change with a tested rollback path rather than a one-way migration.

**Vercel preview URL as the integration environment from day one.**
Every branch deploys to a preview URL automatically. Using the preview URL for the visual parity audit, the performance audit, and the QA sign-off meant those audits were testing the actual deployment artifact, not a `next dev` local server.

**Redirect map before any SEO work.**
All Wix canonical URL patterns (`/product-page/*`, `/collections/*`, `/category/*`) were redirected to cfw routes early. This meant Google could crawl the new site on preview URLs without ever seeing a 404 for a previously-indexed URL. Any future migration should treat the redirect map as a Phase 0 deliverable.

**Cache-first CMS design from the start.**
The `SiteContent` pattern — `getSiteContent(key, fallback)` with a 5-minute `unstable_cache` TTL — is the right shape for owner-editable copy in a serverless Next.js app. The mistake was adding it page-by-page rather than establishing the pattern in the design system and wiring all copy at once. Future migrations should audit all hardcoded owner-visible strings at Phase 0 and seed the CMS in the same sprint.
