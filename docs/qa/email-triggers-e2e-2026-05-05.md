# Email Triggers E2E — Full 30-Row Matrix

**Bead:** cf-w1u1  
**Owner:** Stilgar (go/no-go) + godfrey (Velo) + rennala (audit author)  
**Run date:** Pending staging backend publication (see Blocker section)  
**Test inboxes:** halworker85+test@gmail.com (customer), halworker85+owner@gmail.com (owner)

---

## Blocker

Rows 1–10, 12–19, 21–28, 30 require `/_functions/*` access on staging.
`staging.carolinafutons.com/_functions/` currently returns 404 — Stilgar has not yet
published the Velo backend to the staging or production environment.

**Unblock path:** Stilgar publishes Wix backend to staging OR cf-3qt.8 DNS cutover
completes and production Velo functions are accessible.

Required env vars before running live rows:

| Var | Description |
|-----|-------------|
| `STAGING_BASE_URL` | `https://staging.carolinafutons.com` |
| `STAGING_BEARER` | Owner or test-member bearer token |
| `TEST_MEMBER_ID` | Wix member ID for a test account |
| `TEST_PRODUCT_ID` | Any stocked product ID |
| `TEST_INBOX` | `halworker85+test@gmail.com` |
| `TEST_INBOX_OWNER` | `halworker85+owner@gmail.com` |
| `ALERT_CRON_KEY` | From Wix Secrets (cron endpoint auth) |

---

## Pre-run Checklist

- [ ] cf-c6g5 closed — all 28 triggered email templates created and Published in Wix
- [ ] cf-m3tj merged/published — (post-purchase email queue worker)
- [ ] cf-fovb merged/published — (winback cron)
- [ ] cf-hafn merged/published — (contact form auto-reply, prerequisite for row 19)
- [ ] cf-xdji merged/published — (swatch customer confirmation, prerequisite for row 21)
- [ ] cf-jmmk merged/published — (delivery confirmation handler, prerequisite for row 8)
- [ ] Staging backend published by Stilgar (prerequisite for all BLOCKED rows)
- [ ] Test member account created with known TEST_MEMBER_ID and TEST_INBOX email
- [ ] TEST_PRODUCT_ID is stocked and visible on staging

---

## 30-Row Touchpoint Matrix

| Row | Touchpoint | Trigger mechanism | Template ID | Recipient | CI spec | Status |
|-----|------------|-------------------|-------------|-----------|---------|--------|
| 1 | Welcome: exit-intent popup | UI submit on `/` (exit-intent form) | `welcome_series_1` | Submitter | `email-triggers-blocked.spec.ts` | BLOCKED |
| 2 | Welcome: triggerWelcomeSeries Velo fn | `POST /_functions/triggerWelcomeSeries { email, firstName }` | `welcome_series_1..5` | Customer | `email-triggers-blocked.spec.ts` | BLOCKED |
| 3 | Welcome: member signup | `wixMembers_onMemberCreated` event → events.js | `welcome_series_1..5` | New member | `email-triggers-blocked.spec.ts` | BLOCKED |
| 4 | Welcome: newsletter signup | `POST /_functions/mailingListSignups { email }` (cf-3l0d) | `welcome_series_*` | Subscriber | `email-triggers-blocked.spec.ts` | BLOCKED + cf-3l0d |
| 5 | Order confirmation | `wixEcom_onOrderCreated` → events.js | `order_confirmation` | Buyer | `email-triggers-blocked.spec.ts` | BLOCKED |
| 6 | Shipping: parcel carrier | `wixEcom_onFulfillmentCreated` (UPS/FedEx) | `order_shipped` | Buyer | `email-triggers-blocked.spec.ts` | BLOCKED |
| 7 | Shipping: LTL freight | `wixEcom_onFulfillmentCreated` (XPO/Estes/WWEX) | `freight_shipped` | Buyer | `email-triggers-blocked.spec.ts` | BLOCKED |
| 8 | Delivery confirmation | `wixEcom_onOrderDelivered` (cf-jmmk) | `delivery_confirmation` | Buyer | `email-triggers-blocked.spec.ts` | BLOCKED + cf-jmmk |
| 9 | Post-purchase D+3/7/30 | `processEmailQueueCron` (after delivery) | `post_purchase_1`, `post_purchase_2`, `post_purchase_3` | Buyer | `email-triggers-blocked.spec.ts` | BLOCKED |
| 10 | Post-purchase D+14 review reward | `processEmailQueueCron` (D+14 slot) | `post_purchase_review_reward` | Buyer | `email-triggers-blocked.spec.ts` | BLOCKED |
| 11 | Cart abandonment | `CartAbandonmentTracker` visibilitychange → `POST /api/email/trigger { type: "cart-recovery" }` | `cart_recovery` | Member | `email-triggers.spec.ts` | **PASS** (mock) |
| 12 | Browse recovery | `POST /_functions/triggerBrowseRecoveryCron` | `browse_recovery_1` | Member | `email-triggers-blocked.spec.ts` | BLOCKED |
| 13 | Re-engagement D+0/7/21 | `POST /_functions/triggerReengagementCron` | `reengagement_1..3` | Inactive member | `email-triggers-blocked.spec.ts` | BLOCKED + TEST_MEMBER_ID |
| 14 | Winback | `POST /_functions/scanAndTriggerWinbackCron` | CMS-driven winback template | Lapsed customer | `email-triggers-blocked.spec.ts` | BLOCKED |
| 15 | Review request D+7 | `POST /_functions/runReviewRequestEmailsCron` (order 7d ago) | `post_purchase_2` | Buyer | `email-triggers-blocked.spec.ts` | BLOCKED |
| 16 | Wishlist price-drop | `checkWishlistAlerts` cron (price reduced on wishlisted product) | `wishlist_price_drop` | Member | `email-triggers-blocked.spec.ts` | BLOCKED + TEST_PRODUCT_ID |
| 17 | Tier milestone | Order crossing 500/2000 pts threshold | `tier_*_achieved` / `tier_*_approach` | Member | `email-triggers-blocked.spec.ts` | BLOCKED + TEST_MEMBER_ID |
| 18 | Contact form: owner notification | Server Action `sendContactForm` → `/_functions/contactSubmissions` (Velo sends to owner) | `OWNER_EMAIL_TEMPLATE` | Site owner | `contact-page.spec.ts` (UI smoke only) | PARTIAL |
| 19 | Contact form: customer auto-reply | Same submission → Velo sends auto-reply (cf-hafn) | `contact_form_auto_reply` | Submitter | `email-triggers-blocked.spec.ts` | BLOCKED + cf-hafn |
| 20 | Swatch request: owner notify | `POST /api/swatch-request` → `callVelo` | `swatch_owner_notify` | Site owner | `email-verify.spec.ts` | **PASS** (wire) |
| 21 | Swatch request: customer confirmation | `POST /_functions/sampleRequests` (cf-xdji resolveContactId) | `swatch_confirmation` | Customer | `email-triggers-blocked.spec.ts` | BLOCKED + cf-xdji |
| 22 | Swatch follow-up D+5/10 | `processEmailQueueCron` (sequenceType=swatch_followup) | `swatch_followup_arrived`, `swatch_followup_decide` | Customer | `email-triggers-blocked.spec.ts` | BLOCKED |
| 23 | Consultation follow-up | Consultation booking UI flow | `consultation_followup` | Customer | `email-triggers-blocked.spec.ts` | BLOCKED |
| 24 | Newsletter → Klaviyo ESP sync | `POST /_functions/mailingListSignups` → `_syncToESPInternal` (fire-and-forget) | (Klaviyo profile create) | — | `email-triggers-blocked.spec.ts` | BLOCKED + Klaviyo key |
| 25 | Birthday reward | `POST /_functions/runBirthdayRewardCron` (member birthday = today) | `birthday_reward_*` | Member | `email-triggers-blocked.spec.ts` | BLOCKED |
| 26 | Gift card delivery | Gift card checkout → `giftCards.web.js` direct sends | `gift_card_delivered_to_buyer`, `gift_card_delivered_to_recipient` | Buyer + recipient | `email-triggers-blocked.spec.ts` | BLOCKED |
| 27 | Fabric sample: confirmation + fulfillment | Fabric sample request + ship event | `fabric_sample_confirmation`, `fabric_sample_fulfillment` | Customer | `email-triggers-blocked.spec.ts` | BLOCKED |
| 28 | Product Q&A: owner alert | Server Action → `productQA.web.js` → `POST /_functions/submitProductQuestion` | `OWNER_EMAIL_TEMPLATE` | Site owner | `email-triggers-blocked.spec.ts` | BLOCKED |
| 29 | Back-in-stock notify-me | `POST /api/notify-me` → `callVelo` | `restock_notification` | Subscriber | `email-verify.spec.ts` | **PASS** (wire) |
| 30 | Review thank-you | Product review submit on PDP | `review_thank_you` | Reviewer | `email-triggers-blocked.spec.ts` | BLOCKED |

**Status key:**
- **PASS (mock)** — client-side trigger intercepted with `page.route()`; Velo call not made
- **PASS (wire)** — Next.js API route validates payload and returns correct HTTP status; no inbox delivery verified
- **PARTIAL** — UI smoke only; no API or email delivery assertion
- **BLOCKED** — requires staging `/_functions/` access

---

## Coverage Summary

| Status | Count | Rows |
|--------|-------|------|
| PASS (full mock / wire) | 3 | 11, 20, 29 |
| PARTIAL | 1 | 18 |
| BLOCKED | 26 | 1–10, 12–17, 19, 21–28, 30 |

---

## Run Results (fill in when staging backend is available)

Copy this table and fill in during the live verification run.

| Row | Trigger used | Inbox checked | Email received | Template correct | Variables correct | Notes |
|-----|-------------|--------------|----------------|-----------------|-------------------|-------|
| 1 | | halworker85+test | ○ | ○ | ○ | |
| 2 | | halworker85+test | ○ | ○ | ○ | |
| 3 | | halworker85+test | ○ | ○ | ○ | |
| 4 | | halworker85+test | ○ | ○ | ○ | |
| 5 | | halworker85+test | ○ | ○ | ○ | |
| 6 | | halworker85+test | ○ | ○ | ○ | |
| 7 | | halworker85+test | ○ | ○ | ○ | |
| 8 | | halworker85+test | ○ | ○ | ○ | |
| 9 | | halworker85+test | ○ | ○ | ○ | |
| 10 | | halworker85+test | ○ | ○ | ○ | |
| 11 | mock via page.route() | — (mocked) | ✓ | ✓ | ✓ | email-triggers.spec.ts |
| 12 | | halworker85+test | ○ | ○ | ○ | |
| 13 | | halworker85+test | ○ | ○ | ○ | |
| 14 | | halworker85+test | ○ | ○ | ○ | |
| 15 | | halworker85+test | ○ | ○ | ○ | |
| 16 | | halworker85+test | ○ | ○ | ○ | |
| 17 | | halworker85+test | ○ | ○ | ○ | |
| 18 | | halworker85+owner | ○ | ○ | ○ | UI smoke only; inbox not asserted |
| 19 | | halworker85+test | ○ | ○ | ○ | |
| 20 | wire via /api/swatch-request | — (no inbox check) | ✓ | — | — | email-verify.spec.ts |
| 21 | | halworker85+test | ○ | ○ | ○ | |
| 22 | | halworker85+test | ○ | ○ | ○ | |
| 23 | | halworker85+test | ○ | ○ | ○ | |
| 24 | | — (Klaviyo profile) | ○ | — | — | |
| 25 | | halworker85+test | ○ | ○ | ○ | |
| 26 | | halworker85+test | ○ | ○ | ○ | |
| 27 | | halworker85+test | ○ | ○ | ○ | |
| 28 | | halworker85+owner | ○ | ○ | ○ | |
| 29 | wire via /api/notify-me | — (no inbox check) | ✓ | — | — | email-verify.spec.ts |
| 30 | | halworker85+test | ○ | ○ | ○ | |

**Legend:** ✓ = verified, ✗ = failed, ○ = not yet run
