# API Hookup Verification Checklist

End-to-end verification that payment + shipping integrations are wired and healthy. Run this before a launch, after touching any checkout/shipping code, and on a recurring schedule (e.g. monthly) once live.

> **Architecture in one sentence**: Wix runs the checkout. The Next.js storefront only collects the cart and hands off to a Wix-hosted payment page. Stripe / PayPal / UPS / FedEx live in Wix Dashboard settings; WWEX LTL freight + white-glove logic lives in the Velo backend (`shippingIntelligence.web.js`).

## Prerequisite — products must be visible

**Most checks below require at least one product reachable at `/products/<slug>` and addable to cart.** As of 2026-04, all category PLPs render `0 products / No products found` (cf-gr1w, P1). Until that ships, only the §1 + §2 + §6 checks are exercisable. Use the seeded-fixture preview deployment (cf-9izd) to unblock §3-§5 ahead of the cf-gr1w fix.

---

## §1. Payment providers (Wix Dashboard — no code needed)

These run inside Wix's hosted checkout. The storefront never touches Stripe/PayPal directly — verifying they work means verifying Wix says they're connected.

| Check | Where | Healthy looks like |
|---|---|---|
| Stripe connected | Wix Dashboard → **Settings** → **Accept Payments** → Stripe row | "Connected" + green status. Test charge succeeds in Stripe Dashboard test mode. |
| PayPal connected | Same panel, PayPal row | "Connected" + green. Sandbox checkout completes a $0.01 test order. |
| Apple Pay / Google Pay enabled | Same panel | Toggles ON. Visible at Wix-hosted checkout when on Safari (Apple Pay) or Chrome (Google Pay). |
| Tax calculation | Wix → **Store** → **Settings** → **Tax** | At least one tax rule (state-level NC required for SE customers). Run a $100 test cart to NC zip and confirm sales tax is added. |
| Currency | Same panel | USD. |

**Verification cart**: Use a real card in Stripe test mode (`4242 4242 4242 4242` / any future date / any CVC). Walk through the full flow — confirm the redirect from `/cart` lands on a Wix-hosted page, payment succeeds, and the customer returns to `/order-confirmation?orderId=…`.

---

## §2. Wix Stores carrier integrations (parcel — UPS / FedEx)

UPS and FedEx are connected via Wix's first-party shipping integrations. Rate quotes are computed inside Wix's checkout — the storefront just shows the result.

| Check | Where | Healthy looks like |
|---|---|---|
| UPS account connected | Wix Dashboard → **Store** → **Shipping** → Real-time carrier accounts | UPS row says "Connected". Service codes (Ground, 2-day) are listed. |
| FedEx account connected | Same panel | FedEx row "Connected" if used. |
| Shipping rules configured | Same → **Shipping rules** | Rules cover (a) free standard over $500, (b) standard parcel for everything else, (c) regional rules for SE, (d) WWEX LTL fallback. |
| Default origin ZIP | Same → settings | `28792` (Hendersonville). Misconfigured origin = wildly wrong rates. |
| Package profiles | Wix CMS → `PackageProfiles` collection (per `_resolveProfile` in shippingIntelligence.web.js) | Each product SKU has a row with `length_in / width_in / height_in / weight_lbs / category / requiresPallet / requiresFreight`. Missing profile = falls back to `'default'` profile, which may overshoot rates. |

**Verification cart**: Add a small product (mattress topper) → checkout → confirm UPS Ground rate shows for a NC ZIP. Add a frame → confirm rates include both parcel and a freight option if `requiresFreight: true`.

---

## §3. WWEX LTL freight (Velo backend)

LTL freight is computed by `shippingIntelligence.web.js` → `getLTLRates(originZip='28792', destZip, packages)`. This calls WWEX's API directly with our credentials. Triggered for any product with `requiresPallet: true` OR `requiresFreight: true` OR weight thresholds passing `shouldUseLTL(packages)`.

| Check | Where | Healthy looks like |
|---|---|---|
| WWEX API credentials set | Wix Velo → **Secrets Manager** | Keys present: `WWEX_API_KEY`, `WWEX_ACCOUNT_ID` (names per Velo env, confirm with shippingIntelligence.web.js). |
| Rate-limit collections exist | Wix CMS → `BundleRateLimits` + `EstimateRateLimits` | Collections exist; ANON shared bucket entries flush every minute. |
| Force-LTL override rules | Wix CMS → `ShippingOverrides` (per `getMatchingActions(ctx)`) | Empty is fine; check rows haven't accumulated stale forced-LTL flags from prior testing. |
| LTL fallback rates | Code: `getLTLFallbackRates(zip, packages)` in shippingIntelligence.web.js | Returns reasonable rates if WWEX errors. Test by mocking a 5xx from WWEX and confirming the fallback appears at checkout instead of "shipping unavailable." |

**Verification cart**: Add a queen futon frame (typically `requiresPallet: true`) to a cart shipping to Charlotte (`28202`) → checkout → confirm an "LTL Freight Standard" or similar option appears with a 5-7 day window and a 3-figure cost. Sentry should show NO errors tagged `op: 'getLTLRates'`.

---

## §4. White-glove delivery (CF in-house truck network)

Computed inside `shippingIntelligence.web.js` based on `localZones` matching (zone1-zone4). Surfaces on PDP via `/api/delivery-zone` (godfrey owns the implementation; currently 501 stub) AND inside Wix-hosted checkout as a delivery option.

| Check | Where | Healthy looks like |
|---|---|---|
| `localZones` config matches Velo | Code: `src/lib/delivery/local-zones.ts` (storefront) vs `src/public/sharedTokens.js` (Velo) | Both have the same four zones with matching prices and ZIP lists. PR cf-3qt.4.4 lifted the storefront copy from sharedTokens.js — keep them in sync. |
| Terrain surcharge ZIPs | Code: `shippingConfig.whiteGlove.terrainSurcharge.zips` in sharedTokens.js | Up to date. Misses cause undercharging on mountain routes (e.g. Banner Elk, Highlands). |
| White-glove price > standard delivery price | Per zone | zone1 $99>$39, zone2 $149>$69, zone3 $199>$99, zone4 $249>$149. Off-by-one in a future edit will create absurd UX. |
| `/api/delivery-zone` shipped | godfrey-owned bead cf-3qt.2 | Currently 501. Once shipped: GET `?zip=28792` returns `{ ok:true, zone:'zone1', delivery:39, whiteGlove:99, deliveryDays:'2–4' }`. |
| `/getting-it-home` page | PR cf-3qt.4.4 (#151) | Type `28792` → zone1; `28801` → zone2; `28202` → zone3; `90210` → out-of-area. |

**Verification cart**: Add a >$1,500 frame → cart → checkout → confirm white-glove option appears as a delivery method with the zone-appropriate price. Repeat for a Hendersonville ZIP (zone1 $99) and an Asheville ZIP (zone2 $149).

---

## §5. PDP shipping estimator (`/api/delivery-zone` + `getShippingEstimate`)

The PDP-side widget that says "Get to 28792 in 2-4 business days." Uses `shippingIntelligence.web.js` → `getShippingEstimate(productId, zip)` via the Wix client (when wired) OR a future `/api/delivery-zone` route.

| Check | Where | Healthy looks like |
|---|---|---|
| `/api/delivery-zone` returns 200 (not 501) | Code: `src/app/api/delivery-zone/route.ts` | Owned by godfrey under cf-3qt.2; currently 501 stub. |
| PDP widget renders shipping options | PDP at `/products/<slug>` | Component `PdpShippingEstimate` accepts a ZIP, calls API, renders 1-3 option rows with carrier + window + price. |
| Rate-limit in effect | Velo `shippingIntelligence.web.js` → `checkRateLimit(ESTIMATE_RATE_COLLECTION, …)` | Anon: 60 req/min shared global; logged-in: 20 req/min per member. Excess returns `'Too many requests'`. |

**Verification**: hit `/products/<slug>`, type a ZIP, confirm options appear within ~1s. Hit it 100 times in a minute (anonymous) → expect `'Service temporarily busy'` after the 60th request. Sentry shows zero unexpected errors tagged `op: 'getShippingEstimate'`.

---

## §6. Cart + order webhooks

Once an order completes, Wix posts to webhooks the storefront uses for fulfillment + post-purchase comms.

| Check | Where | Healthy looks like |
|---|---|---|
| `/api/order-lookup` reachable | Code: `src/app/api/order-lookup/route.ts` | 200 with order JSON when a valid orderId is passed; 404 on miss. |
| `/order-confirmation` page renders | `/order-confirmation?orderId=<test-order-id>` | Renders order summary, line items, total, shipping address, ETA. |
| Wix → cf email triggers | Wix Dashboard → **Automations** | At least: order confirmation, shipping notification, review-request follow-up (per cf-fsm). |

**Verification**: Place a test order through Stripe test mode → confirm confirmation email arrives within 5 minutes → reload `/order-confirmation` → confirm order shows.

---

## §7. Sentry + observability

Errors anywhere in the chain should surface in Sentry. Verify the alert path before launch.

| Check | Where | Healthy looks like |
|---|---|---|
| Sentry DSN set on Vercel | Vercel project env vars | `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` set on production env. |
| Sentry captures Wix-SDK failures | Sentry → Issues → filter `kind:wix-sdk` | Recent events visible (or none if everything healthy). Tags include `source`, `op`, `code`, `httpStatus`. |
| Sentry alerts wired | Sentry → Alerts | At least one rule for "new issue with `kind:unexpected`" routes to email/Slack. |

---

## Quick run-order

1. **§1 Payment** in Wix Dashboard (no cart needed)
2. **§2 Carriers** in Wix Dashboard (no cart needed)
3. **§4 White-glove zone math** via `/getting-it-home` (no cart needed — PR #151)
4. *Wait for cf-gr1w fix or use cf-9izd preview*
5. **§3 LTL freight** end-to-end via test cart with a heavy item
6. **§5 PDP estimator** end-to-end on a real PDP
7. **§6 Webhooks** by completing a Stripe-test-mode order
8. **§7 Sentry** by intentionally breaking a path (e.g. invalid Wix client ID in a preview env) and confirming the event lands

If any line item in §1-§4 is **not** "Healthy looks like X" — that's the gap to fix before launching.
