/**
 * cf-oi01: shipping + payments E2E — mocked (CI-safe) scaffold.
 *
 * Companion to e2e/checkout-real-shipping-payments.spec.ts which requires
 * CF_E2E_REAL_SHIPPING=1 + live Vercel preview + real UPS/Stripe creds.
 *
 * THIS FILE: Stage 1 (PDP + add-to-cart) and the viewport console-error sweep
 * run in CI unconditionally. Stages 2–5 are marked test.fixme() and SKIP.
 *
 * ## Architectural constraints (stages 2–5)
 *  - UPS rate calls originate from the Next.js API route (server-side), NOT
 *    the browser. page.route() cannot intercept them. MSW or env-level API
 *    overrides are required before stages 2–5 can assert on rate rendering.
 *  - Stripe Elements runs cross-origin (stripe.com). page.route() does not
 *    intercept cross-origin iframe requests.
 *  - page.request.post() is NOT intercepted by page.route(). Stage 5 needs
 *    to call the real webhook endpoint (or use MSW at the server layer).
 *
 * ## What runs today
 *  - Stage 1: PDP loads, first available variant selected, add-to-cart works,
 *    cart line price visible, no unexpected console errors.
 *  - Viewport sweep: no console errors on PDP at 375/768/1280px.
 *
 * ## Activation (cf-oi01)
 *  When Stilgar provides UPS_CLIENT_ID/SECRET/ACCOUNT + Stripe test keys:
 *  1. Plug creds into Vercel env
 *  2. Wire MSW handlers for UPS + Stripe at server level
 *  3. Remove test.fixme() from stages 2–5 and run against preview
 *
 * ## Test matrix (mirrors the real-network spec)
 *  - Parcel          — small accessory, NC ZIP 28792
 *  - LTL             — frame 70–499 lb, Atlanta ZIP 30309
 *  - Freight WG      — heavy, white-glove zone (NC 28792)
 *  - Freight far     — heavy, far zone (CA 90210)
 */

import { test, expect, type Page, type Route } from "@playwright/test";

// ── UPS rate fixture responses ────────────────────────────────────────────────

const UPS_RATE_PARCEL = {
  RateResponse: {
    RatedShipment: [
      {
        Service: { Code: "03", Description: "UPS Ground" },
        TotalCharges: { CurrencyCode: "USD", MonetaryValue: "18.45" },
        BillingWeight: { UnitOfMeasurement: { Code: "LBS" }, Weight: "4.0" },
      },
    ],
  },
};

const UPS_RATE_LTL = {
  RateResponse: {
    RatedShipment: [
      {
        Service: { Code: "308", Description: "UPS Freight LTL" },
        TotalCharges: { CurrencyCode: "USD", MonetaryValue: "312.00" },
        BillingWeight: { UnitOfMeasurement: { Code: "LBS" }, Weight: "180.0" },
      },
    ],
  },
};

const UPS_RATE_FREIGHT_WHITEGLOVE = {
  RateResponse: {
    RatedShipment: [
      {
        Service: { Code: "308", Description: "White Glove Delivery" },
        TotalCharges: { CurrencyCode: "USD", MonetaryValue: "499.00" },
        BillingWeight: { UnitOfMeasurement: { Code: "LBS" }, Weight: "350.0" },
      },
    ],
  },
};

const UPS_RATE_FREIGHT_FAR = {
  RateResponse: {
    RatedShipment: [
      {
        Service: { Code: "308", Description: "Freight Standard" },
        TotalCharges: { CurrencyCode: "USD", MonetaryValue: "1150.00" },
        BillingWeight: { UnitOfMeasurement: { Code: "LBS" }, Weight: "350.0" },
      },
    ],
  },
};

// ── Stripe fixture responses ──────────────────────────────────────────────────

const STRIPE_PAYMENT_INTENT_CREATED = {
  id: "pi_test_mock123",
  object: "payment_intent",
  amount: 49900,
  currency: "usd",
  status: "requires_payment_method",
  client_secret: "pi_test_mock123_secret_mock456",
};

const STRIPE_PAYMENT_INTENT_SUCCEEDED = {
  ...STRIPE_PAYMENT_INTENT_CREATED,
  status: "succeeded",
  charges: { data: [{ id: "ch_test_mock", amount: 49900 }] },
};

// ── Wix order fixture ─────────────────────────────────────────────────────────

const WIX_ORDER_CREATED = {
  order: {
    id: "wix-order-mock-001",
    status: "PENDING_PAYMENT",
    total: { amount: "499.00", currency: "USD" },
  },
};

// ── Test matrix ──────────────────────────────────────────────────────────────

const MATRIX = [
  {
    band: "parcel",
    slug: process.env.E2E_PARCEL_SLUG ?? "trundle-pad-cover",
    shipTo: { zip: "28792", state: "NC", city: "Hendersonville" },
    upsFixture: UPS_RATE_PARCEL,
    expectedRateLabel: /ups|ground/i,
    expectedPrice: "18.45",
  },
  {
    band: "ltl",
    slug: process.env.E2E_LTL_SLUG ?? "kingston-futon-frame",
    shipTo: { zip: "30309", state: "GA", city: "Atlanta" },
    upsFixture: UPS_RATE_LTL,
    expectedRateLabel: /ltl|freight/i,
    expectedPrice: "312.00",
    expectsNoWhiteGlove: true,
  },
  {
    band: "freight-whiteglove",
    slug: process.env.E2E_FREIGHT_SLUG ?? "ranchero-murphy-cabinet-bed",
    shipTo: { zip: "28792", state: "NC", city: "Hendersonville" },
    upsFixture: UPS_RATE_FREIGHT_WHITEGLOVE,
    expectedRateLabel: /white[-\s]?glove/i,
    expectedPrice: "499.00",
  },
  {
    band: "freight-far",
    slug: process.env.E2E_FREIGHT_SLUG ?? "ranchero-murphy-cabinet-bed",
    shipTo: { zip: "90210", state: "CA", city: "Beverly Hills" },
    upsFixture: UPS_RATE_FREIGHT_FAR,
    expectedRateLabel: /freight/i,
    expectedPrice: "1150.00",
    expectsNoWhiteGlove: true,
  },
] as const;

// ── Stripe test card ──────────────────────────────────────────────────────────

const STRIPE_TEST_CARD = {
  number: "4242 4242 4242 4242",
  exp: "12/34",
  cvc: "123",
  zip: "28792",
};

// ── Wix checkout host pattern ─────────────────────────────────────────────────

const WIX_CHECKOUT_HOST_RE =
  /(\.wix\.com|\.wixsite\.com|\.editorx\.io|\/checkout)/i;

// ── Route interceptors ───────────────────────────────────────────────────────

/** Intercept UPS rate API calls and return the given fixture. */
async function mockUpsRates(page: Page, fixture: unknown): Promise<void> {
  await page.route(/ups\.com\/.*(rates|Rating)|\/api\/shipping\/rates/i, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fixture),
    });
  });
}

/** Intercept Stripe PaymentIntents and return a mock succeeded intent. */
async function mockStripePaymentIntent(page: Page): Promise<void> {
  await page.route(/api\.stripe\.com\/v1\/payment_intents/, async (route: Route) => {
    const method = route.request().method();
    const fixture =
      method === "POST"
        ? STRIPE_PAYMENT_INTENT_CREATED
        : STRIPE_PAYMENT_INTENT_SUCCEEDED;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fixture),
    });
  });
}

/** Intercept the cfw /api/checkout/webhook endpoint. */
async function mockWebhook(page: Page): Promise<void> {
  await page.route(/\/api\/checkout\/webhook|\/api\/stripe\/webhook/i, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ received: true }),
    });
  });
}

/** Intercept Wix order-created API (POST to ecom orders endpoint only). */
async function mockWixOrderCreate(page: Page): Promise<void> {
  await page.route(/wixapis\.com\/ecom\/v\d+\/orders\b/, async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(WIX_ORDER_CREATED),
      });
    } else {
      await route.continue();
    }
  });
}

// ── Variant helper ────────────────────────────────────────────────────────────

async function selectFirstAvailableVariant(page: Page): Promise<void> {
  const groups = page.locator('fieldset[data-slot="variant-option"]');
  const groupCount = await groups.count();
  for (let i = 0; i < groupCount; i++) {
    const group = groups.nth(i);
    const firstAvailable = group
      .locator('[role="radio"][data-available="true"]:not([data-selected="true"])')
      .first();
    if (await firstAvailable.isVisible().catch(() => false)) {
      await firstAvailable.click();
    }
  }
}

// ── Console error collector ──────────────────────────────────────────────────

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
}

// ── Per-band test suites ─────────────────────────────────────────────────────

test.setTimeout(60_000);

for (const band of MATRIX) {
  test.describe(`cf-oi01 mocked — ${band.band} (${band.shipTo.zip})`, () => {
    test(`stage 1 — PDP loads + add-to-cart (${band.band})`, async ({ page }) => {
      const consoleErrors = collectConsoleErrors(page);

      await mockUpsRates(page, band.upsFixture);
      await page.goto(`/products/${band.slug}`);
      await selectFirstAvailableVariant(page);

      const addToCart = page.getByRole("button", { name: /add to cart/i }).first();
      await expect(addToCart).toBeEnabled({ timeout: 15_000 });
      await addToCart.click();

      await expect(
        page.getByTestId("cart-line-price").first(),
      ).toBeVisible({ timeout: 15_000 });

      expect(
        consoleErrors.filter((e) => !/favicon|sourcemap/i.test(e)),
        `unexpected console errors on PDP (${band.band}): ${consoleErrors.join(", ")}`,
      ).toHaveLength(0);
    });

    test(`stage 2 — shipping rate renders from mocked UPS response (${band.band})`, async ({ page }) => {
      // page.route() intercepts browser requests only — UPS calls originate
      // from the Next.js server route, so this fixture never fires in CI.
      // Un-stub after MSW server-side mocking is wired (cf-oi01 activation).
      test.fixme(
        true,
        `stage 2 pending — UPS fixture must be forwarded through cfw server route, not page.route(). Wire in cf-oi01 once Vercel env + MSW are set.`,
      );

      await mockUpsRates(page, band.upsFixture);
      await page.goto(`/products/${band.slug}`);
      await selectFirstAvailableVariant(page);
      await page.getByRole("button", { name: /add to cart/i }).first().click();
      await expect(page.getByTestId("cart-line-price").first()).toBeVisible();
      await page.goto("/checkout");

      const rateRow = page.getByText(band.expectedRateLabel).first();
      await expect(rateRow).toBeVisible({ timeout: 20_000 });

      const rateText = (await rateRow.textContent()) ?? "";
      const m = rateText.match(/\$([\d,]+(?:\.\d{2})?)/);
      expect(m, `no dollar amount in rate row: ${rateText}`).not.toBeNull();
      const dollars = Number(m![1]!.replace(/,/g, ""));
      expect(dollars).toBeGreaterThanOrEqual(1);
      expect(dollars).toBeLessThanOrEqual(5000);

      if ((band as { expectsNoWhiteGlove?: boolean }).expectsNoWhiteGlove) {
        await expect(page.getByText(/white[-\s]?glove/i)).toHaveCount(0);
      }
    });

    test(`stage 3 — Wix checkout redirect + Stripe Elements iframe (${band.band})`, async ({ page }) => {
      // Requires real Wix session to fire createRedirectSession and a live
      // Vercel preview. Un-stub after first live preview run (melania).
      test.fixme(
        true,
        "stage 3 redirect assertion requires real Wix session — un-stub after first live preview run",
      );

      await mockUpsRates(page, band.upsFixture);
      await mockStripePaymentIntent(page);

      await page.goto(`/products/${band.slug}`);
      await selectFirstAvailableVariant(page);
      await page.getByRole("button", { name: /add to cart/i }).first().click();
      await expect(page.getByTestId("cart-line-price").first()).toBeVisible();
      await page.goto("/checkout");

      await page.waitForURL(WIX_CHECKOUT_HOST_RE, { timeout: 30_000 });
      expect(page.url()).toMatch(WIX_CHECKOUT_HOST_RE);

      const stripeIframe = page
        .locator('iframe[src*="stripe.com"], iframe[name^="__privateStripe"]')
        .first();
      await expect(stripeIframe).toBeAttached({ timeout: 30_000 });
    });

    test(`stage 4 — Stripe test card fills + mock payment succeeds (${band.band})`, async ({ page }) => {
      await mockUpsRates(page, band.upsFixture);
      await mockStripePaymentIntent(page);
      await mockWixOrderCreate(page);

      // Full stage 4 requires stage 3 to be green on a real preview.
      test.fixme(
        true,
        "stage 4 unblocked by melania after stage 3 confirmed on Vercel preview",
      );

      await page.goto(`/products/${band.slug}`);
      await selectFirstAvailableVariant(page);
      await page.getByRole("button", { name: /add to cart/i }).first().click();
      await expect(page.getByTestId("cart-line-price").first()).toBeVisible();
      await page.goto("/checkout");
      await page.waitForURL(WIX_CHECKOUT_HOST_RE, { timeout: 30_000 });

      // Enter test card into the Stripe Elements iframe.
      const stripeFrame = page
        .locator('iframe[src*="stripe.com"], iframe[name^="__privateStripe"]')
        .first()
        .contentFrame();

      await stripeFrame
        .locator('[placeholder*="Card number"], [name="cardnumber"]')
        .fill(STRIPE_TEST_CARD.number);
      await stripeFrame
        .locator('[placeholder*="MM / YY"], [name="exp-date"]')
        .fill(STRIPE_TEST_CARD.exp);
      await stripeFrame
        .locator('[placeholder="CVC"], [name="cvc"]')
        .fill(STRIPE_TEST_CARD.cvc);
      await stripeFrame
        .locator('[placeholder="ZIP"], [name="postal"]')
        .fill(STRIPE_TEST_CARD.zip);

      await page.getByRole("button", { name: /pay|place order|submit/i }).click();

      // Assert order confirmation appears.
      await expect(
        page.getByText(/order confirmed|thank you|order #/i).first(),
      ).toBeVisible({ timeout: 30_000 });
    });

    test(`stage 5 — webhook mock receives payment.succeeded event (${band.band})`, async ({ page }) => {
      // page.request.post() is NOT intercepted by page.route() — it bypasses
      // the browser context and hits the real endpoint. This stage needs a
      // live Vercel preview with the webhook endpoint deployed.
      // Un-stub in cf-oi01.1 after stage 4 is green on Vercel preview.
      test.fixme(
        true,
        "stage 5 webhook verification — wired in cf-oi01.1 after stage 4 is green on Vercel preview",
      );

      await mockWebhook(page);
      await mockWixOrderCreate(page);

      const response = await page.request.post("/api/checkout/webhook", {
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "t=mock,v1=mocksig",
        },
        data: JSON.stringify({
          type: "payment_intent.succeeded",
          data: { object: STRIPE_PAYMENT_INTENT_SUCCEEDED },
        }),
      });

      expect(response.status()).toBe(200);
      const body = await response.json() as { received?: boolean };
      expect(body.received).toBe(true);
    });
  });
}

// ── Cross-viewport console-error sweep ───────────────────────────────────────

for (const viewport of [
  { width: 375, height: 812, label: "375px" },
  { width: 768, height: 1024, label: "768px" },
  { width: 1280, height: 900, label: "1280px" },
]) {
  test(`no console errors on PDP at ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockUpsRates(page, UPS_RATE_PARCEL);
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !/favicon|sourcemap/i.test(msg.text())) {
        errors.push(msg.text());
      }
    });

    await page.goto(`/products/${process.env.E2E_PARCEL_SLUG ?? "trundle-pad-cover"}`);
    await page.waitForLoadState("networkidle");

    expect(
      errors,
      `console errors at ${viewport.label}: ${errors.join(", ")}`,
    ).toHaveLength(0);
  });
}
