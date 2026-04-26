# Carolina Futons — Testing Guide

Companion to [SITE-OWNER-GUIDE.md](./SITE-OWNER-GUIDE.md) and [API-HOOKUP-VERIFICATION.md](./API-HOOKUP-VERIFICATION.md). Where SITE-OWNER explains *what to do in Wix* and API-HOOKUP explains *what to verify is wired*, this guide explains *how to test that the storefront actually works* — both the automated checks that already run on every change, and the manual walk-throughs Stilgar/QA still need to do before Phase 8 DNS cutover.

> **Audience**: Stilgar (manual cutover testing), QA (regression sweep), devs (test inventory + how to add new coverage).

> **Run order before launch**: §1 quick reference → §3 Stripe Test Mode setup → §2 manual happy paths → §4 backend boundary → §5 cutover go/no-go matrix. The automated suite (§1) runs in CI on every PR — Stilgar doesn't need to invoke it locally unless investigating a regression.

---

## §1. Automated test inventory

CI runs lint + typecheck + Vitest on every PR. Playwright runs on PRs from the repo (skipped for Dependabot bumps). All of this gates merge to `main`.

### Vitest (unit + component)

Location: `src/__tests__/*.test.ts` and `*.test.tsx`. **127 test files, ~275 describe blocks, 1100+ assertions** as of 2026-04-25. Stack: vitest + @testing-library/react + jsdom.

| Surface | Coverage | Representative test file |
|---|---|---|
| **PDP — sticky CTA** | scroll-show/hide, dismiss-on-cart-add, focus management | `PdpStickyCta.test.tsx` |
| **PDP — variant picker** | option → variant mapping, swatch grid, in-stock/out-of-stock disabling | `VariantPicker.test.tsx`, `VariantSwatchGrid.test.tsx`, `variant-selection.test.ts` |
| **PDP — Add to Cart** | gated by valid variant, server action wiring, error surface | `AddToCartButton.test.tsx`, `cart-actions.test.ts` |
| **PDP — gallery + lightbox** | thumb-strip nav, View Transitions API swap, lightbox open/close, keyboard | `PdpGallery.test.tsx`, `PdpImageLightbox.test.tsx` |
| **PDP — wishlist** | save/remove, optimistic state, dashboard sync | `PdpWishlistButton.test.tsx`, `wishlist-actions.test.ts`, `WishlistList.test.tsx` |
| **PDP — share buttons** | Facebook + Pinterest URL composition, encoded params | `PdpShareButtons.test.tsx` |
| **PDP — reviews** | aggregate rating, fallback chain, empty state, JSON-LD honesty | `PdpReviews.test.tsx` |
| **PDP — shipping estimator** | ZIP → zone, white-glove eligibility, surcharge math | `PdpShippingEstimate.test.tsx`, `PdpWhiteGlove.test.tsx`, `local-zones.test.ts` |
| **PDP — stock badge** | derived state matrix (in/low/out/preorder) | `PdpStockBadge.test.tsx`, `stock-badge-state.test.ts` |
| **PDP — cross-sell + recently viewed** | seed source, ordering, dedup, max-card cap | `PdpCrossSell.test.tsx`, `PdpRecentlyViewed.test.tsx`, `cross-sell.test.ts`, `recently-viewed.test.ts` |
| **PLP** | pagination, sort, filter, on-sale predicate, fetchpriority on first 4 cards | `plp-page.test.ts`, `plp-resolver.test.ts`, `plp-query.test.ts`, `ProductCard.test.tsx`, `on-sale.test.ts` |
| **PLP — staggered card reveal** | per-card delay, reduced-motion no-op | `HeroReveal.test.tsx` |
| **Cart** | drawer open/close, line-item edit, totals, dual-write to mobile | `CartDrawer.test.tsx`, `cart-state.test.ts` |
| **Checkout** | server action constructs Wix redirect, error fallback | `checkout-action.test.ts` |
| **Account / dashboard** | member gate, /dashboard, /dashboard/orders, /dashboard/wishlist | `AccountPage.test.tsx`, `DashboardShell.test.tsx`, `OrderHistoryList.test.tsx`, `WishlistList.test.tsx` |
| **Auth (Wix OAuth)** | session cookie shape, CSRF, refresh flow | `auth-session.test.ts`, `auth-session-route.test.ts`, `auth-member.test.ts` |
| **Forms** | /contact (server action + schema), newsletter footer, winback UTM, spring-sale | `contact-actions.test.ts`, `contact-schema.test.ts`, `ContactForm.test.tsx`, `newsletter-actions.test.ts`, `NewsletterSignup.test.tsx`, `winback-page.test.tsx`, `SpringSalePage.test.tsx` |
| **Blog** | /blog index, /blog/[slug] dynamic, post hydration from Wix Blog SDK | `blog-page.test.tsx`, `blog-pages.test.tsx`, `wix-blog.test.ts` |
| **FAQ** | data file shape, schema.org FAQPage JSON-LD, accordion render | `faq-data.test.ts`, `faq-schema.test.ts`, `FaqPage.test.tsx` |
| **Search** | /search guided-empty, two-section results, /api/search shape, suggestion chips | `SearchPage.test.tsx`, `api-search.test.ts` |
| **Redirects** | every legacy URL (`/futons`, `/post/:slug`, `/category-page/:slug`, etc.) 308s | `redirects.test.ts` |
| **JSON-LD** | Organization, Product, BreadcrumbList, AggregateRating, Review nodes | `json-ld.test.ts`, `JsonLd.test.tsx` |
| **OG / Twitter Card metadata** | per-page openGraph builders, image fallback | `og-metadata.test.ts` |
| **Sitemap** | /sitemap.xml composition, lastmod, blog post inclusion | `sitemap.test.ts` |
| **GA4 funnel** | view_item, add_to_cart, begin_checkout, purchase event payloads | `ga4-events.test.ts`, `Ga4PurchaseTracker.test.tsx`, `GA4Tag.test.tsx`, `PdpViewItemTracker.test.tsx` |
| **Pixels (Meta, TikTok, Pinterest)** | env-driven mount, Pageview + Purchase wiring | `MetaPixel.test.tsx`, `MetaPurchaseTracker.test.tsx`, `TikTokPixel.test.tsx`, `PinterestTag.test.tsx` |
| **Custom DOM events** | cart-changed, wishlist-changed, route-changed | `custom-events.test.ts` |
| **View transitions / route progress** | RouteProgressBar mount, page-transition config | `PageTransition.test.tsx`, `page-transition-config.test.ts`, `RouteProgressBar.test.tsx` |
| **Header / Footer / nav** | shop links, search-as-link, mobile menu, scroll-shrink, search button → /search | `Header.test.tsx`, `Header.scrollShrink.test.tsx`, `HeaderMobileMenu.test.tsx`, `Footer.test.tsx` |
| **Hero / above-fold** | carousel, parallax, word stagger, trust bar, stats strip, testimonials | `HeroCarousel.test.tsx`, `HeroParallax.test.tsx`, `HeroWordStagger.test.tsx`, `TrustBar.test.tsx`, `StatsStrip.test.tsx`, `TestimonialsStrip.test.tsx` |
| **LivingSky time-of-day** | dawn/morning/noon/dusk/night state machine | `living-sky-engine.test.ts` |
| **Wix client / SDK adapters** | client construction, token cache, error path tagging | `wix-client.test.ts`, `wix-client-tokens.test.ts`, `wix-errors.test.ts`, `velo-client.test.ts`, `products-sentry.test.ts` |
| **Wix Stores reads** | listProducts, getProductBySlug, listProductsOnSale, searchProducts | `products-get-by-slug.test.ts`, `products-on-sale.test.ts`, `cf3qt-reads.test.ts`, `derived-products.test.ts` |
| **API stubs** | /api/cart, /api/wishlist, /api/delivery-zone, /api/newsletter, /api/order-lookup return 501 with `{ ok:false, error:"not-implemented" }` until owner ships | `api-stubs.test.ts` |
| **Page-level smokes** (renders without throwing) | About, Contact, Returns, Shipping, Warranty, Reviews, Visit, Press, Spring Sale, Winback, Design-a-Room, FAQ, Guides | `*Page.test.tsx` (~25 files) |
| **Loading + error states** | skeletons, /404, /error, error pages | `loading-skeletons.test.tsx`, `ErrorPages.test.tsx` |
| **Env contract** | required env vars present, type-checked | `env.test.ts` |

**Run locally**:

```bash
cd /Users/hal/gt/carolina-futons-web
npx vitest run                    # full suite, ~15s
npx vitest run src/__tests__/PdpReviews.test.tsx   # one file
npx vitest run --reporter=verbose # show every test name
npx tsc --noEmit                  # type check (CI gate)
npm run lint                      # eslint (CI gate)
```

**Running the full suite is non-negotiable for any code PR** — `npx vitest run` must show `Test Files  N passed`, no failures.

### Playwright (E2E, browser)

Location: `e2e/*.spec.ts`. **5 specs** covering:

| Spec | What it covers |
|---|---|
| `smoke.spec.ts` | `/smoke` route boots, returns 200, contains the smoke marker (proves Vercel + Next is healthy) |
| `plp.spec.ts` | `/shop/futon-frames` PLP controls — pagination, sort/filter, page-link URLs |
| `auth.spec.ts` | `/api/auth/session` OAuth plumbing (no live Wix creds needed); separate `staging only` describe block exercises the round-trip |
| `dashboard.spec.ts` | `/dashboard` member gate (redirects unauth to /account); `staging only` describe runs the round-trip |
| `api-revalidate.spec.ts` | `POST /api/revalidate` — HMAC validation, tag invalidation |

**Run locally**:

```bash
npx playwright install --with-deps chromium   # one-time
npx playwright test                           # all specs
npx playwright test e2e/smoke.spec.ts         # one spec
npx playwright test --ui                      # interactive
```

`playwright.config.ts` boots `next dev` on `:3000` automatically (`reuseExistingServer: !CI`). Auth + dashboard `staging only` blocks are gated on `WIX_*` env vars; they no-op locally without those.

### CI gate (.github/workflows/ci.yml)

Every PR + every push to `main` runs (in order, blocking):

1. `npm ci`
2. `npm run lint` (eslint, max-warnings=0)
3. `npx tsc --noEmit`
4. `npx vitest run`
5. `npx playwright install --with-deps chromium` (skipped for Dependabot — they don't get secrets)
6. `npx playwright test`

A failure at any step blocks merge. The Vercel preview deploy + comment runs in parallel via the GitHub-Vercel app.

---

## §2. Manual testing required by Stilgar / QA

Automated tests cover *that the code does what it says*. Manual testing is for *that the integrated system does what we want* — the half-second of intuition that tells you the gallery feels right, the swatches actually swap, the price update doesn't flicker, the cart drawer doesn't trap focus. Here's the list.

> **Where to test**: a Vercel preview URL (every PR has one in the comments), or the production URL after a release. Stilgar should walk this list end-to-end at least once per release candidate before sign-off.

### 2.1 — PDP (`/products/<slug>`)

Pick a product with variants (e.g. `/products/monterey-futon`):

| Step | Expected |
|---|---|
| Page loads | Hero image visible above the fold, no layout shift, no console errors |
| Click size swatch (e.g. Queen) | Price updates, stock badge updates, no flicker |
| Click fabric swatch | Same — price + stock recompute against the new variant |
| Click an out-of-stock combo | Add-to-Cart button disabled with reason text |
| Click Add to Cart | Cart drawer opens, line item appears, total reflects unit × qty, no "added to cart for variant null" |
| Hover gallery thumbs | Main image swaps via View Transitions (smooth fade, no white flash) |
| Click main image | Lightbox opens, ESC closes, arrow keys navigate, Tab cycles within the modal (focus trap) |
| Click ❤ wishlist | Heart fills, "Saved to wishlist" toast or aria-live update |
| Reload PDP | Wishlist heart still filled (persisted) |
| Click Facebook share | Opens Facebook share dialog with correct URL + title |
| Click Pinterest share | Opens Pinterest pin builder with correct image + description |
| Scroll past the fold | Sticky CTA appears at bottom (mobile) or floating (desktop) |
| Click sticky CTA Add to Cart | Same behavior as the main CTA, drawer opens |
| Add to cart (any product) | Sticky CTA dismisses for the rest of the session (cf-pdp-sticky-cta) |
| Breadcrumbs | Home › Shop › Product Name. Each link navigates correctly |
| Reviews section | Renders 1-3 cards (or empty state for unseeded slugs); aggregate "4.x ★ (count)" present only when cards present |
| Inspect JSON-LD | View page source → search `"@type":"Product"` — should include `aggregateRating` + `review` array when reviews are shown |
| **>$1500 product** (e.g. Ranchero $2978) | White-glove delivery toggle visible in shipping estimator |

### 2.2 — PLP (`/shop/<category>`)

| Step | Expected |
|---|---|
| /shop/futon-frames loads | Grid of cards, count "X products", LCP fast (cards above fold load eagerly via fetchpriority) |
| Sort dropdown — Price asc | Cards reorder, URL updates with `?sort=price-asc`, page count recomputes |
| Filter — On Sale | Only sale-priced products shown; URL updates |
| Pagination → Page 2 | URL `?page=2`, scrolls to top of grid, new products visible |
| Card hover (desktop) | Card lifts, secondary image cross-fades in, accent strip slides in |
| Card focus (keyboard) | Same affordances trigger via Tab |
| `/shop/mattresses-sale` | Only on-sale mattresses (per `isProductOnSale` predicate) |
| Reduced-motion enabled (System Preferences → Accessibility → Display → Reduce motion) | No transforms; opacity tint only on hover; no card shake |

### 2.3 — Cart + checkout

| Step | Expected |
|---|---|
| Open cart drawer (header icon) | Drawer slides in from right; line items + totals visible |
| Increment qty | Total recomputes; no flicker |
| Remove line item | Item disappears, total updates, drawer doesn't close |
| Empty cart state | "Your cart is empty" copy + Continue Shopping link |
| Click Checkout | Redirects to Wix-hosted checkout page (`checkout.wix.com/...`) |
| Fill Wix shipping address (NC ZIP) | UPS Ground rate appears |
| Fill heavy-frame ZIP (28202 Charlotte) | LTL freight + white-glove options appear |
| Pay with Stripe test card 4242 4242 4242 4242 | Order completes, redirect to `/order-confirmation?orderId=<id>` |
| Order confirmation page | Renders order summary, line items, total, address, ETA |
| Email | Order confirmation arrives within 5 min (Wix Automations) |

### 2.4 — Account / dashboard

| Step | Expected |
|---|---|
| Click 👤 (header) | Navigates to `/account` |
| Click "Sign in" | Redirects to Wix OAuth, returns to `/account` post-auth |
| Click "Dashboard" | `/dashboard` loads, member name visible |
| Click "Orders" | `/dashboard/orders` lists past orders with status |
| Click "Wishlist" | `/dashboard/wishlist` lists saved items, Remove button works |
| Sign out | Returns to `/`, header shows Sign In again |

### 2.5 — Forms

| Form | URL | Expected |
|---|---|---|
| Contact | `/contact` | Submit valid form → success state, thank-you copy. Submit invalid → field-level error + aria-live. **Post-#145 hotfix**: confirm submission lands in Wix CMS `contactSubmissions` collection. |
| Newsletter (footer) | any page footer | Submit valid email → "Thanks, you're subscribed". Submit dupe → idempotent, no error. **Post-cf-3qt.5.5**: row added to Wix CMS `mailingListSignups`. |
| Winback (UTM) | `/winback?utm_source=email` | UTM params captured, surface tagged copy |
| Spring sale | `/spring-sale` | Promo copy + CTA → /shop/mattresses-sale |
| Design a Room | `/design-a-room` | Form/inquiry submits |

### 2.6 — Blog

| Step | Expected |
|---|---|
| `/blog` | Index lists ~12 posts; titles, dates, read-time, hero images |
| Click a post | `/blog/<slug>` renders title, body, author/date meta, social share |
| `/blog/<unknown>` | Returns 404 (not blank page) |

### 2.7 — Empty / error states

| State | Expected |
|---|---|
| `/search?q=zzznomatch` | "No results for 'zzznomatch'" + suggestion chips |
| `/search` (no q) | Guided empty: heading + form + suggestion chips, no SDK calls |
| Empty cart drawer | Friendly empty state + Continue Shopping link |
| `/404` (e.g. `/products/does-not-exist`) | Branded 404 with home link, not Vercel default |
| `/error` (force a runtime error) | Branded error boundary, not white screen |

### 2.8 — Tracking + observability

| Check | How | Expected |
|---|---|---|
| GA4 view_item | PDP load → GA4 Realtime DebugView | Event `view_item` with item_id, item_name, value, currency |
| GA4 add_to_cart | Click Add to Cart → GA4 Realtime | Event `add_to_cart` with same payload |
| GA4 begin_checkout | Click Checkout → GA4 Realtime | Event `begin_checkout` |
| GA4 purchase | Complete Stripe-test-mode order → GA4 Realtime | Event `purchase` with transaction_id, value, items[] |
| Meta pixel Pageview | Browse the site → Meta Events Manager | Pageview events fire on each route |
| Meta pixel Purchase | Complete order → Meta Events Manager | Purchase event with value + currency |
| Pinterest tag Pageview | Browse → Pinterest Conversions | Pageview events fire (gated on `NEXT_PUBLIC_PINTEREST_ID` env) |
| TikTok pixel Pageview | Browse → TikTok Events Manager | Pageview events fire |
| Sentry capture | Force an error (broken Wix client ID in preview env) → Sentry → Issues | Event lands within 30s with tag `kind:wix-sdk` or `kind:unexpected` |

### 2.9 — Visual polish (mobile @ 375px)

Open Chrome DevTools → device emulation → iPhone SE (375px wide):

| Surface | Expected |
|---|---|
| Header | Logo + hamburger + cart icon fit; search opens /search; no overflow |
| Hero | Headline wraps gracefully; CTA tappable (≥44×44px) |
| PLP | 2-col grid; cards readable; pagination tappable |
| PDP | Gallery scrollable; sticky CTA visible at bottom; variant swatches tappable |
| Cart drawer | Full-width on mobile; close button accessible |
| Footer | Columns stack; no horizontal scroll; social icons tappable |

### 2.10 — LivingSky time-of-day

LivingSky drives the home hero gradient based on local hour. Test by changing system clock OR pass `?livingSky=dawn|morning|noon|dusk|night` query (if the override exists in the engine):

| Hour band | Expected gradient |
|---|---|
| 05:00-08:00 dawn | Soft pink/orange |
| 08:00-12:00 morning | Pale blue/cream |
| 12:00-17:00 noon | Bright blue/white |
| 17:00-20:00 dusk | Amber/violet |
| 20:00-05:00 night | Deep navy/cream stars |

Test all 5 bands at least once before launch.

### 2.11 — Redirects (308)

Confirm legacy Wix Studio paths still resolve. Open each in a new tab — they should land on the new URL with a 308 in DevTools Network:

| Legacy | New |
|---|---|
| `/futons` | `/shop/futon-frames` |
| `/murphy-beds` | `/shop/murphy-cabinet-beds` |
| `/mattresses` | `/shop/mattresses` |
| `/frames` | `/shop/platform-beds` |
| `/sale` | `/shop/mattresses-sale` |
| `/product-page/<slug>` | `/products/<slug>` |
| `/post/<slug>` | `/blog/<slug>` |
| `/shipping-policy` | `/shipping` |
| `/privacy-policy` | `/privacy` |
| `/refund-policy` | `/returns` |
| `/terms-and-conditions` | `/terms` |
| `/accessibility-statement` | `/accessibility` |
| `/members-area` | `/account` |
| `/thank-you` | `/order-confirmation` |
| `/book-online` | `/contact` |
| `/white-glove-delivery` | `/shipping` |

The full list lives in `next.config.ts` `redirects()`. Vitest pins each entry — `redirects.test.ts` will fail before a regression ships.

---

## §3. Stripe Test Mode setup (Stilgar self-serve)

Stripe Test Mode is the only safe way to walk the cart → payment → confirmation loop without charging a real card.

### Toggle ON

1. Wix Dashboard → **Settings** → **Accept Payments** → Stripe row → **Manage**.
2. Toggle **Test Mode** ON.
3. Save. The storefront immediately routes new checkouts through Stripe's test environment.

### Test card numbers

| Scenario | Number | Notes |
|---|---|---|
| Success | `4242 4242 4242 4242` | Any future expiry, any CVC, any ZIP |
| Decline (generic) | `4000 0000 0000 0002` | Verifies the failure path renders cleanly |
| Decline (insufficient funds) | `4000 0000 0000 9995` | Triggers Stripe's specific error code |
| 3D Secure required | `4000 0025 0000 3155` | Verifies the auth challenge flow |

### Toggle OFF

After testing: Wix Dashboard → **Settings** → **Accept Payments** → Stripe → **Manage** → Test Mode OFF → Save. **Do not leave Test Mode on overnight** — real customers landing during a test window will see fake "test mode" banners on the checkout page.

> Tip: keep an eye on the Stripe Dashboard (`dashboard.stripe.com` → top-right toggle "Viewing test data") in a second tab. Every test charge appears there within a second; this is the fastest way to confirm the storefront is actually reaching Stripe.

---

## §4. Backend interface tests (Velo webMethod + Vercel boundary)

The storefront talks to four Velo backend endpoints + the Wix SDK. Each has a contract that must hold for production traffic.

### 4.1 Velo `_functions/*` health

Velo exposes backend modules as `https://www.carolinafutons.com/_functions/<name>`. The storefront proxies through the Wix client (not direct), but health-checking the raw endpoint is the fastest way to isolate "is Velo up" from "is the storefront broken".

| Endpoint | Owner module | Health check |
|---|---|---|
| `_functions/getShippingEstimate` | `shippingIntelligence.web.js` | `curl -X POST https://www.carolinafutons.com/_functions/getShippingEstimate -H 'Content-Type: application/json' -d '{"productId":"<id>","zip":"28792"}'` → 200 with rate JSON |
| `_functions/getLTLRates` | `shippingIntelligence.web.js` | Posts return rates within 3s; 429 if rate-limited |
| `_functions/getReviewStats` (when wired) | TBD | currently static — see `src/lib/product/review-stats.ts` |
| `_functions/recordContact` | `contactSubmissions.web.js` | POST a test row → check Wix CMS `contactSubmissions` for the entry |

### 4.2 cartSessionService dual-write

`src/lib/wix/cart.ts` writes cart state to the Wix `cartSessions` collection so the mobile app can mirror it. Verify after any cart edit:

1. Add a product to the cart on the storefront.
2. Wix CMS → `cartSessions` → most recent row should have a sessionId matching the storefront's `cf-cart-session` cookie + a `lineItems` array reflecting the cart.
3. Edit qty on the storefront → row updates within ~2s.
4. Empty the cart → row's `lineItems` becomes `[]`.

If the row doesn't update, check Sentry for `kind:wix-sdk` errors tagged `op: 'cartSession.update'`.

### 4.3 contactSubmissions (post cf-3qt.4.6)

After cf-3qt.4.6 rewired `/contact` → Wix CMS:

| Check | How |
|---|---|
| Form submit lands in CMS | Submit /contact with a unique name → Wix CMS `contactSubmissions` → row exists with name + email + message + UTC timestamp |
| Required fields enforced server-side | Submit empty form via raw POST → 4xx, no row created |
| XSS payload escaped | Submit `<script>alert(1)</script>` in the message → row contains the literal text, not HTML; Wix Admin viewer shows it as plain text |
| Email notification sent | If a Wix Automation rule exists for `contactSubmissions`, the inbox receives a copy within 5 min |

### 4.4 mailingListSignups (post cf-3qt.5.5)

After cf-3qt.5.5 wired the footer newsletter:

| Check | How |
|---|---|
| Subscribe lands in CMS | Submit footer email → Wix CMS `mailingListSignups` → row added with email + UTC timestamp + source page |
| Idempotent on resubscribe | Submit same email twice → only one row OR row's `lastSeen` updated; UI shows "already subscribed" copy |
| Bounce handling | Out of scope — Wix Marketing handles bounce flagging downstream |

### 4.5 Env contract

The storefront's required env vars (see `src/__tests__/env.test.ts` for the canonical list):

| Var | Where set | Notes |
|---|---|---|
| `WIX_CLIENT_ID_HEADLESS` | Vercel env (Production + Preview) | Wix headless OAuth client ID |
| `WIX_BACKEND_KEY` | Vercel env (server-only — NEVER `NEXT_PUBLIC_`) | Velo backend invocation key |
| `WIX_VELO_SITE_URL` | Vercel env | `https://www.carolinafutons.com` (or staging equiv) |
| `NEXT_PUBLIC_SITE_URL` | Vercel env | Public URL used for canonical/OG/JSON-LD |
| `NEXT_PUBLIC_GA4_ID` | Vercel env | GA4 measurement ID — empty disables analytics in dev |
| `NEXT_PUBLIC_META_PIXEL_ID` | Vercel env | Meta pixel — empty disables |
| `NEXT_PUBLIC_PINTEREST_ID` | Vercel env | Pinterest tag — empty disables |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | Vercel env | TikTok pixel — empty disables |
| `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` | Vercel env | Sentry — both must be set |
| `SESSION_COOKIE_SECRET` | Vercel env | Session JWT signing |
| `REVALIDATE_SECRET` | Vercel env | HMAC for `/api/revalidate` |

Run the contract test before promoting a deploy: `npx vitest run src/__tests__/env.test.ts`.

---

## §5. Phase 8 cutover go/no-go testing matrix

DNS cutover from Wix Studio (`carolinafutons.com` → Wix) to the cfw storefront (`carolinafutons.com` → Vercel) is a one-way operation. The matrix below is the gate. **All checks must be green for at least 24 hours before cutover.**

### T-24h: pre-cutover synthetic checks

| Check | Acceptance | If red |
|---|---|---|
| `npx vitest run` on `main` | All passing | Block — fix the regression |
| `npx playwright test` on `main` | All passing (chromium) | Block |
| `npx tsc --noEmit` + `npm run lint` | Clean | Block |
| Vercel production deploy | Green build, current commit = `main` HEAD | Promote latest |
| All §2 manual checks | Walked end-to-end on the production deploy | Block per failed item |
| Stripe Test Mode order | Walked successfully (cart → checkout → confirmation → email) | Block |
| Sentry "wix-sdk error rate" | < 0.5% of requests in last 24h | Investigate spike |
| Sitemap | `/sitemap.xml` returns 22+ URLs (per cf-rb07 fix) | Block |
| Robots | `/robots.txt` allows `/` + Sitemap link present | Block |
| `/api/search?q=futon` | 200, returns shape `{ ok, q, products, posts, total }` | Block (search broken) |
| Header + footer link audit | All internal hrefs return 200 | Block per dead link |

### T-1h: order-rate baseline

Capture the baseline order rate for the current Wix Studio site so we can detect regression after cutover.

| Metric | Source | Capture |
|---|---|---|
| Orders/hour over the last 7 days | Wix Dashboard → **Orders** → filter by date | Compute `orders / (24 × 7)` for the rolling baseline |
| Cart abandonment % | Wix Dashboard → **Analytics** → Funnel | Capture for after-comparison |
| Checkout completion % | Same | Capture |
| Avg order value | Same | Capture |

Record these in the cutover runbook so post-cutover we can compare apples to apples.

### T+1h, T+6h, T+24h: post-cutover monitoring

Re-measure at +1h, +6h, +24h:

| Threshold | Action |
|---|---|
| Order rate ≥ 90% of baseline | Continue monitoring |
| Order rate 75-90% | Investigate (spike-vs-trend; look at Sentry, GA4 funnel for drop-off page) — **no rollback yet** |
| Order rate < 75% sustained for 2+ hours OR any P0 (checkout 5xx, payment failure rate >5%) | **Rollback** per §5.1 |

### 5.1 DNS rollback procedure

If the cutover fails the order-rate gate at T+24h, roll DNS back to Wix Studio. **No code changes — purely a DNS flip.**

1. Cloudflare (or whoever owns the DNS) → `carolinafutons.com` zone.
2. Restore the Wix Studio CNAME / A records (saved in the cutover runbook before the cutover).
3. TTL is set to 300s for the cutover window — propagation ≤ 10 min for most resolvers.
4. Confirm: `dig carolinafutons.com` shows the old Wix IP/CNAME within 15 min.
5. Wix Studio site is still live (we never turned it off — that happens only after T+30 days clean).
6. Post-mortem: Sentry + GA4 funnel + Wix order log → identify the leak; fix on cfw; re-attempt cutover.

---

## Quick reference card

```bash
# Where to run everything
cd /Users/hal/gt/carolina-futons-web

# Full automated pre-merge gate
npm run lint && npx tsc --noEmit && npx vitest run && npx playwright test

# Subset — just one test file
npx vitest run src/__tests__/<File>.test.tsx

# Subset — just one Playwright spec
npx playwright test e2e/<spec>.spec.ts

# Manual smoke on prod after deploy
open https://carolina-futons-web.vercel.app/shop/futon-frames
open https://carolina-futons-web.vercel.app/products/<a-slug>
open https://carolina-futons-web.vercel.app/sitemap.xml

# Stripe test card during checkout
4242 4242 4242 4242   any future date   any CVC
```

If a manual step fails, file a bead before fixing. The bead is the audit trail; the fix is the consequence.
