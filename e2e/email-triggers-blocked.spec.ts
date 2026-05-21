/**
 * Email trigger E2E stubs — cf-juu6 / cf-w1u1
 *
 * Skip-gated stubs for 26 of the 30 touchpoints in the cf-w1u1 matrix
 * that are not yet covered by email-triggers.spec.ts or email-verify.spec.ts.
 *
 * HOW TO UNBLOCK: Stilgar must publish the Velo backend to staging so that
 * https://staging.carolinafutons.com/_functions/* resolves. Then unskip
 * row by row as the backend + template prereqs land.
 *
 * Pre-flight env vars (set before unskipping):
 *   STAGING_BASE_URL   — https://staging.carolinafutons.com
 *   STAGING_BEARER     — owner or test-member bearer token
 *   TEST_MEMBER_ID     — Wix member ID
 *   TEST_PRODUCT_ID    — any stocked product ID
 *   TEST_INBOX         — halworker85+test@gmail.com
 *   TEST_INBOX_OWNER   — halworker85+owner@gmail.com
 *   ALERT_CRON_KEY     — from Wix Secrets
 *
 * Rows already covered (not stubbed here):
 *   Row 11 — cart abandonment    → email-triggers.spec.ts
 *   Row 18 — contact form owner  → email-verify.spec.ts
 *   Row 20 — swatch owner notify → email-verify.spec.ts
 *   Row 29 — restock /notify-me  → email-verify.spec.ts
 */

// BLOCKED: staging /_functions/ inaccessible — cf-w1u1

import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

const BASE = process.env.STAGING_BASE_URL ?? "http://localhost:3000";
const BEARER = process.env.STAGING_BEARER ?? "";
const MEMBER_ID = process.env.TEST_MEMBER_ID ?? "";
const PRODUCT_ID = process.env.TEST_PRODUCT_ID ?? "";
const INBOX = process.env.TEST_INBOX ?? "halworker85+test@gmail.com";
const INBOX_OWNER = process.env.TEST_INBOX_OWNER ?? "halworker85+owner@gmail.com";
const CRON_KEY = process.env.ALERT_CRON_KEY ?? "";

// ── Row 1 — Welcome: exit-intent popup ────────────────────────────────────

test.skip("row1: welcome exit-intent popup fires welcome_series_1 to submitter", async ({
  page,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: submit exit-intent popup with TEST_INBOX on /
  // Expected recipient: TEST_INBOX
  await page.goto(`${BASE}/`);
  // TODO: trigger exit-intent popup (mouseleave or delay)
  // TODO: fill email field and submit
  // Assert: welcome_series_1 queued for INBOX
  expect(INBOX).toBeTruthy(); // placeholder — replace with inbox assertion
});

// ── Row 2 — Welcome: triggerWelcomeSeries Velo function ───────────────────

test.skip("row2: POST /_functions/triggerWelcomeSeries queues welcome_series_1..5", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: POST /_functions/triggerWelcomeSeries { email, firstName }
  // Expected recipient: TEST_INBOX
  const res = await request.post(`${BASE}/_functions/triggerWelcomeSeries`, {
    headers: { Authorization: `Bearer ${BEARER}` },
    data: { email: INBOX, firstName: "Test" },
  });
  expect(res.ok()).toBe(true);
  // Assert: welcome_series_1 queued for INBOX (check EmailQueue CMS or inbox)
});

// ── Row 3 — Welcome: member signup (wixMembers_onMemberCreated) ───────────

test.skip("row3: new member creation fires welcome_series_1..5 via wixMembers_onMemberCreated", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: sign up new test member → Wix event auto-fires
  // Expected recipient: TEST_INBOX (new member's email)
  // NOTE: requires a fresh email address per run to avoid duplicate-member errors
  const res = await request.post(`${BASE}/api/auth/register`, {
    data: { email: `test+${Date.now()}@example.com`, password: "TestPass123!" },
  });
  expect(res.ok()).toBe(true);
  // Assert: welcome_series_1 queued (check EmailQueue or inbox after short delay)
});

// ── Row 4 — Welcome: newsletter signup (post cf-3l0d) ─────────────────────

test.skip("row4: newsletter signup triggers welcome_series via mailingListSignups", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Also blocked on: cf-3l0d not merged
  // Trigger: POST /_functions/mailingListSignups { email }
  // Expected recipient: TEST_INBOX
  const res = await request.post(`${BASE}/_functions/mailingListSignups`, {
    data: { email: INBOX },
  });
  expect(res.ok()).toBe(true);
  // Assert: welcome_series_* queued for INBOX
});

// ── Row 5 — Order confirmation (wixEcom_onOrderCreated) ───────────────────

test.skip("row5: order placement fires order_confirmation to buyer via wixEcom_onOrderCreated", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: place test order on staging → Wix event fires → events.js#wixEcom_onOrderCreated
  // Expected recipient: TEST_INBOX (buyer)
  // NOTE: requires a real checkout or Wix order API simulation
  // Assert: order_confirmation email sent to INBOX with correct orderNumber + total
  expect(INBOX).toBeTruthy(); // placeholder
});

// ── Row 6 — Shipping: parcel carrier (wixEcom_onFulfillmentCreated) ────────

test.skip("row6: parcel fulfillment fires order_shipped to buyer", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: fulfil order with parcel carrier (UPS/FedEx) → wixEcom_onFulfillmentCreated
  // Expected recipient: TEST_INBOX
  // Assert: order_shipped email queued for INBOX
  expect(INBOX).toBeTruthy(); // placeholder
});

// ── Row 7 — Shipping: LTL freight carrier ────────────────────────────────

test.skip("row7: LTL freight fulfillment fires freight_shipped to buyer", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: fulfil order with XPO/Estes/WWEX carrier → wixEcom_onFulfillmentCreated
  // Expected recipient: TEST_INBOX
  // Assert: freight_shipped (not order_shipped) queued for INBOX
  expect(INBOX).toBeTruthy(); // placeholder
});

// ── Row 8 — Delivery confirmation (wixEcom_onOrderDelivered / cf-jmmk) ────

test.skip("row8: order marked delivered fires delivery_confirmation to buyer", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Also blocked on: cf-jmmk merged/published
  // Trigger: mark order delivered → wixEcom_onOrderDelivered
  // Expected recipient: TEST_INBOX
  // Assert: delivery_confirmation email queued for INBOX
  expect(INBOX).toBeTruthy(); // placeholder
});

// ── Row 9 — Post-purchase Day 3/7/30 sequence ────────────────────────────

test.skip("row9: post-purchase sequence fires post_purchase_1..3 after delivery", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: deliver order (row 8) → fast-forward EmailQueue.scheduledFor → drain queue
  //   POST /_functions/processEmailQueueCron { X-Cron-Secret: CRON_KEY }
  // Expected recipient: TEST_INBOX
  const res = await request.post(`${BASE}/_functions/processEmailQueueCron`, {
    headers: { "X-Cron-Secret": CRON_KEY },
  });
  expect(res.ok()).toBe(true);
  // Assert: post_purchase_1, post_purchase_2, post_purchase_3 queued for INBOX at D+3/7/30
});

// ── Row 10 — Post-purchase Day-14 review reward ───────────────────────────

test.skip("row10: post-purchase D14 review-reward fires post_purchase_review_reward", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: same as row 9 — fast-forward to D+14 in EmailQueue
  // Expected recipient: TEST_INBOX
  // Assert: post_purchase_review_reward queued for INBOX at D+14
  expect(INBOX).toBeTruthy(); // placeholder
});

// ── Row 12 — Browse recovery ──────────────────────────────────────────────

test.skip("row12: browse recovery fires browse_recovery_1 after product view + leave", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: known member browses product page + leaves → POST /_functions/triggerBrowseRecoveryCron
  // Expected recipient: TEST_INBOX
  const res = await request.post(`${BASE}/_functions/triggerBrowseRecoveryCron`, {
    headers: { "X-Cron-Secret": CRON_KEY },
  });
  expect(res.ok()).toBe(true);
  // Assert: browse_recovery_1 queued for INBOX
});

// ── Row 13 — Re-engagement (Day 0/7/21) ──────────────────────────────────

test.skip("row13: re-engagement cron fires reengagement_1..3 for inactive member", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Also requires: TEST_MEMBER_ID inactive for X days
  // Trigger: POST /_functions/triggerReengagementCron { X-Cron-Secret }
  // Expected recipient: TEST_INBOX
  const res = await request.post(`${BASE}/_functions/triggerReengagementCron`, {
    headers: { "X-Cron-Secret": CRON_KEY },
  });
  expect(res.ok()).toBe(true);
  // Assert: reengagement_1 queued for INBOX; reengagement_2 at D+7; reengagement_3 at D+21
});

// ── Row 14 — Winback ──────────────────────────────────────────────────────

test.skip("row14: winback cron fires CMS-driven winback sequence", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: POST /_functions/scanAndTriggerWinbackCron { X-Cron-Secret }
  // Expected recipient: TEST_INBOX (member matching EmailSequences winback criteria)
  const res = await request.post(`${BASE}/_functions/scanAndTriggerWinbackCron`, {
    headers: { "X-Cron-Secret": CRON_KEY },
  });
  expect(res.ok()).toBe(true);
  // Assert: winback email queued for qualifying INBOX member
});

// ── Row 15 — Review request (orders + 7d) ────────────────────────────────

test.skip("row15: review-request cron fires post_purchase_2 for orders placed 7d ago", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: POST /_functions/runReviewRequestEmailsCron { X-Cron-Secret }
  //   (requires a test order placed exactly 7d ago — seed or fast-forward)
  // Expected recipient: TEST_INBOX
  const res = await request.post(`${BASE}/_functions/runReviewRequestEmailsCron`, {
    headers: { "X-Cron-Secret": CRON_KEY },
  });
  expect(res.ok()).toBe(true);
  // Assert: post_purchase_2 (review request) queued for INBOX
});

// ── Row 16 — Wishlist price-drop alert ───────────────────────────────────

test.skip("row16: wishlist price-drop fires wishlist_price_drop when price reduced", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: add TEST_PRODUCT_ID to wishlist → reduce product price via Wix Stores admin
  //   → checkWishlistAlerts cron fires
  // Expected recipient: TEST_INBOX
  // Assert: wishlist_price_drop queued for INBOX with correct product + new price
  expect(PRODUCT_ID).toBeTruthy(); // placeholder — requires PRODUCT_ID env var
});

// ── Row 17 — Tier milestone (approach / achieved) ─────────────────────────

test.skip("row17: order crossing tier threshold fires tier_*_achieved email", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Also requires: TEST_MEMBER_ID with known starting point balance
  // Trigger: place order that pushes member past 500 pts (Mountain Guide) or 2000 pts (Summit Master)
  // Expected recipient: TEST_INBOX
  // Assert: tier_*_achieved (or tier_*_approach) queued for INBOX
  expect(MEMBER_ID).toBeTruthy(); // placeholder — requires TEST_MEMBER_ID env var
});

// ── Row 19 — Contact form: customer auto-reply (cf-hafn) ─────────────────

test.skip("row19: contact form submission fires contact_form_auto_reply to submitter", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Also blocked on: cf-hafn merged/published
  // Trigger: POST /_functions/contactSubmissions { name, email, phone, subject, message }
  // Expected recipient: TEST_INBOX (submitter, not owner)
  const res = await request.post(`${BASE}/_functions/contactSubmissions`, {
    data: {
      name: "Test User",
      email: INBOX,
      phone: "828-555-0100",
      subject: "Test inquiry",
      message: "E2E test message — please ignore",
    },
  });
  expect(res.ok()).toBe(true);
  // Assert: contact_form_auto_reply queued for INBOX (not INBOX_OWNER)
});

// ── Row 21 — Swatch request: customer confirmation ───────────────────────

test.skip("row21: swatch request fires swatch_confirmation to customer when contact exists", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Also blocked on: cf-xdji (resolveContactId / appendOrCreateContact) merged/published
  // Trigger: POST /_functions/sampleRequests { name, email, address, productId, swatchNames }
  //   using email of a pre-existing CRM contact
  // Expected recipient: TEST_INBOX
  const res = await request.post(`${BASE}/_functions/sampleRequests`, {
    data: {
      name: "Test User",
      email: INBOX,
      address: "123 Test St, Asheville NC 28801",
      productId: PRODUCT_ID,
      swatchNames: ["Suede Chocolate", "Linen Navy"],
    },
  });
  expect(res.ok()).toBe(true);
  // Assert: swatch_confirmation queued for INBOX (not just owner notification)
});

// ── Row 22 — Swatch follow-up sequence ───────────────────────────────────

test.skip("row22: swatch follow-up sequence fires arrived + decide emails", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: swatch request (row 20/21) → fast-forward EmailQueue rows
  //   where sequenceType='swatch_followup' → drain via processEmailQueueCron
  // Expected recipient: TEST_INBOX
  // Assert: swatch_followup_arrived queued at D+5; swatch_followup_decide at D+10
  expect(INBOX).toBeTruthy(); // placeholder
});

// ── Row 23 — Consultation follow-up ──────────────────────────────────────

test.skip("row23: consultation booking fires consultation_followup email", async ({
  page,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: complete consultation-booking flow on staging (Calendly embed or Wix booking)
  // Expected recipient: TEST_INBOX
  // Assert: consultation_followup queued for INBOX
  await page.goto(`${BASE}/consultations`);
  // TODO: complete booking flow
  // Assert: consultation_followup email queued for INBOX
  expect(INBOX).toBeTruthy(); // placeholder
});

// ── Row 24 — Newsletter → Klaviyo ESP sync ───────────────────────────────

test.skip("row24: newsletter signup triggers Klaviyo profile create via _syncToESPInternal", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: same as row 4 (mailingListSignups) — _syncToESPInternal fires fire-and-forget
  // Expected result: Klaviyo profile created for TEST_INBOX
  // NOTE: requires Klaviyo test API key on staging
  const res = await request.post(`${BASE}/_functions/mailingListSignups`, {
    data: { email: INBOX },
  });
  expect(res.ok()).toBe(true);
  // Assert: Klaviyo profile exists for INBOX (via Klaviyo API GET /profiles?filter=email:INBOX)
});

// ── Row 25 — Birthday reward ──────────────────────────────────────────────

test.skip("row25: birthday cron fires birthday_reward_* on member's birthday", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: set TEST_MEMBER_ID birthday to today → next birthdayRewardService cron run
  //   POST /_functions/runBirthdayRewardCron { X-Cron-Secret }
  // Expected recipient: TEST_INBOX
  const res = await request.post(`${BASE}/_functions/runBirthdayRewardCron`, {
    headers: { "X-Cron-Secret": CRON_KEY },
  });
  expect(res.ok()).toBe(true);
  // Assert: birthday_reward_* queued for INBOX
});

// ── Row 26 — Gift card delivery (buyer + recipient) ───────────────────────

test.skip("row26: gift card purchase fires delivered email to buyer AND recipient", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: purchase gift card via staging checkout → giftCards.web.js direct sends
  // Expected recipients: TEST_INBOX (buyer) + TEST_INBOX (recipient if same for test)
  // Assert: gift_card_delivered_to_buyer + gift_card_delivered_to_recipient both sent
  expect(INBOX).toBeTruthy(); // placeholder — requires real checkout
});

// ── Row 27 — Fabric sample: confirmation + fulfillment ────────────────────

test.skip("row27: fabric sample request fires confirmation then fulfillment email", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: place fabric-sample request → confirm; ship → fulfillment email
  // Expected recipient: TEST_INBOX
  // Step 1: request → Assert fabric_sample_confirmation queued for INBOX
  // Step 2: mark shipped → Assert fabric_sample_fulfillment queued for INBOX
  expect(INBOX).toBeTruthy(); // placeholder
});

// ── Row 28 — Product Q&A: owner alert ────────────────────────────────────

test.skip("row28: product Q&A submission fires OWNER_EMAIL_TEMPLATE to owner", async ({
  request,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: submit Q&A on staging PDP → productQA.web.js → owner alert
  // Expected recipient: TEST_INBOX_OWNER (SITE_OWNER_CONTACT_ID)
  const res = await request.post(`${BASE}/_functions/submitProductQuestion`, {
    data: {
      productId: PRODUCT_ID,
      question: "E2E test question — please ignore",
      email: INBOX,
    },
  });
  expect(res.ok()).toBe(true);
  // Assert: OWNER_EMAIL_TEMPLATE queued for INBOX_OWNER
});

// ── Row 30 — Review thank-you ─────────────────────────────────────────────

test.skip("row30: product review submission fires review_thank_you to reviewer", async ({
  page,
}) => {
  // BLOCKED: staging /_functions/ inaccessible — cf-w1u1
  // Trigger: submit product review on staging PDP
  // Expected recipient: TEST_INBOX (reviewer)
  await page.goto(`${BASE}/product-page/${PRODUCT_ID}`);
  // TODO: navigate to reviews section, submit review form
  // Assert: review_thank_you queued for INBOX
  expect(INBOX).toBeTruthy(); // placeholder
});
