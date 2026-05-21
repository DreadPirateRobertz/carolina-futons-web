/**
 * cf-oi01: Full checkout flow — real UPS shipping rates + Stripe/PayPal (test mode)
 *
 * This is the canonical checkout E2E spec. It supersedes the scaffolding in
 * checkout-real-shipping-payments.spec.ts and adds the missing coverage
 * from the radahn review (G4 PayPal sandbox, G5 viewport sweep).
 *
 * STATUS: Blocked pending Stilgar providing credentials (see "Blocking inputs").
 * All tests gate on CF_E2E_REAL_SHIPPING=1 so CI is never affected.
 *
 * ## Architecture note (G1)
 * cfw → createRedirectSession.fullUrl → Wix-hosted *.wix.com checkout page.
 * Stripe is iframe-embedded INSIDE the Wix page. We never land on stripe.com
 * as the top-level URL. PayPal opens a popup from inside the Wix page.
 *
 * ## UPS rate flow (G2)
 * UPS rates are fetched by the Wix-hosted checkout page (wix.com domain),
 * NOT by cfw /api routes. Stage 2 follows the redirect and asserts rendered
 * rate rows + dollar sanity bounds (G7).
 *
 * ## Blocking inputs (Stilgar to provide)
 *   - UPS_CLIENT_ID, UPS_CLIENT_SECRET, UPS_ACCOUNT_NUMBER (Wix staging)
 *   - Confirm prod vs sandbox UPS keys
 *   - STRIPE_PUBLISHABLE_KEY (test mode — pk_test_...)
 *   - PAYPAL_CLIENT_ID (sandbox — sb prefix)
 *   - Ship-from: 824 Locust St, Hendersonville NC 28792 (confirm)
 *   - Test SKU slugs per band (env vars below)
 *
 * ## Run (once unblocked)
 *   CF_E2E_REAL_SHIPPING=1 \
 *   CF_E2E_STRIPE_TEST=1 \
 *   BASE_URL=https://carolina-futons-web.vercel.app \
 *   E2E_PARCEL_SLUG=trundle-pad-cover \
 *   E2E_LTL_SLUG=kingston-futon-frame \
 *   E2E_FREIGHT_SLUG=ranchero-murphy-cabinet-bed \
 *   npx playwright test e2e/checkout-flow.spec.ts
 *
 * ## Acceptance (cf-oi01 bead)
 *   - All 3 shipping bands return live UPS rates (no fixtures)
 *   - Stripe test card completes order in test mode
 *   - PayPal sandbox completes order (G4)
 *   - Wix order record created post-checkout
 *   - Webhook fires + order email logs
 *   - No console errors at 375 / 768 / 1280 viewports (G5)
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import * as fs from "fs";

// ── Run gates ────────────────────────────────────────────────────────────────
const isRealShipping = process.env.CF_E2E_REAL_SHIPPING === "1";
const isStripeTest = process.env.CF_E2E_STRIPE_TEST === "1";
const isLiveDeployment =
  !!process.env.BASE_URL &&
  !process.env.BASE_URL.includes("localhost") &&
  !process.env.BASE_URL.includes("127.0.0.1");

const SHIPPING_SKIP =
  "cf-oi01: requires CF_E2E_REAL_SHIPPING=1 + BASE_URL (non-localhost) + Vercel env wired with UPS/Stripe creds. See spec docblock.";
const STRIPE_SKIP =
  "cf-oi01: requires CF_E2E_STRIPE_TEST=1 on top of REAL_SHIPPING gate. Melania un-skips after stage 3 is observed green.";

// ── Test matrix ──────────────────────────────────────────────────────────────
const PARCEL = {
  band: "parcel",
  slug: process.env.E2E_PARCEL_SLUG ?? "trundle-pad-cover",
  shipTo: { zip: "28792", state: "NC", city: "Hendersonville" },
  expectedRateLabel: /ups|ground/i,
};

const LTL = {
  band: "ltl",
  slug: process.env.E2E_LTL_SLUG ?? "kingston-futon-frame",
  shipTo: { zip: "30309", state: "GA", city: "Atlanta" },
  expectedRateLabel: /ltl|freight/i,
  expectsNoWhiteGlove: true,
};

const FREIGHT_WHITEGLOVE = {
  band: "freight-whiteglove",
  slug: process.env.E2E_FREIGHT_SLUG ?? "ranchero-murphy-cabinet-bed",
  shipTo: { zip: "28792", state: "NC", city: "Hendersonville" },
  expectedRateLabel: /white[-\s]?glove/i,
};

const FREIGHT_FAR = {
  band: "freight-far",
  slug: process.env.E2E_FREIGHT_SLUG ?? "ranchero-murphy-cabinet-bed",
  shipTo: { zip: "90210", state: "CA", city: "Beverly Hills" },
  expectedRateLabel: /freight/i,
  expectsNoWhiteGlove: true,
};

const MATRIX = [PARCEL, LTL, FREIGHT_WHITEGLOVE, FREIGHT_FAR] as const;
type Band = (typeof MATRIX)[number];

// ── Stripe test card ─────────────────────────────────────────────────────────
const STRIPE_TEST_CARD = {
  number: "4242 4242 4242 4242",
  exp: "12/34",
  cvc: "123",
  zip: "28792",
};

// ── Wix-hosted checkout host (G1) ────────────────────────────────────────────
const WIX_CHECKOUT_HOST_RE = /(\.wix\.com|\.wixsite\.com|\.editorx\.io|\/checkout)/i;

// ── Viewports (G5) ──────────────────────────────────────────────────────────
const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

// ── Screenshot dir ───────────────────────────────────────────────────────────
const SS = "e2e-screenshots/cf-oi01";

// ── Slug pre-flight (G6) ─────────────────────────────────────────────────────
let catalogSlugs: Set<string> | null = null;

async function ensureCatalogSlugs(baseUrl: string): Promise<Set<string>> {
  if (catalogSlugs) return catalogSlugs;
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/sitemap.xml`);
    const xml = await res.text();
    const slugs = new Set<string>();
    for (const m of xml.matchAll(/\/products\/([a-z0-9-]+)/gi)) slugs.add(m[1]!);
    catalogSlugs = slugs;
  } catch {
    catalogSlugs = new Set();
  }
  return catalogSlugs;
}

// ── Variant picker helper (G3) ───────────────────────────────────────────────
// Kingston / Ranchero keep add-to-cart disabled until every option group has
// a selection. Walk all fieldsets and click the first available radio.
async function selectFirstVariants(page: Page): Promise<void> {
  const groups = page.locator('fieldset[data-slot="variant-option"]');
  const count = await groups.count();
  for (let i = 0; i < count; i++) {
    const radio = groups
      .nth(i)
      .locator('[role="radio"][data-available="true"]:not([data-selected="true"])')
      .first();
    if (await radio.isVisible().catch(() => false)) await radio.click();
  }
}

// ── Cart setup (shared by stages 2-4) ───────────────────────────────────────
async function addToCart(page: Page, slug: string): Promise<void> {
  await page.goto(`/products/${slug}`);
  await selectFirstVariants(page);
  await page
    .getByRole("button", { name: /add to cart/i })
    .first()
    .click();
  await expect(page.getByTestId("cart-line-price").first()).toBeVisible({
    timeout: 20_000,
  });
}

// ── Wix checkout navigation (shared by stages 2-4) ──────────────────────────
async function navigateToWixCheckout(page: Page): Promise<void> {
  await page.goto("/checkout");
  await page.waitForURL(WIX_CHECKOUT_HOST_RE, { timeout: 30_000 });
}

// ── Rate assertion (G7) ──────────────────────────────────────────────────────
async function assertRateRow(page: Page, band: Band): Promise<void> {
  const rateRow = page.getByText(band.expectedRateLabel).first();
  await expect(rateRow).toBeVisible({ timeout: 30_000 });

  const rateText = (await rateRow.textContent()) ?? "";
  const m = rateText.match(/\$([\d,]+(?:\.\d{2})?)/);
  expect(m, `no dollar amount in rate row: "${rateText}"`).not.toBeNull();
  const dollars = Number(m![1]!.replace(/,/g, ""));
  expect(dollars, "rate below $1 — UPS connector may be broken").toBeGreaterThanOrEqual(1);
  expect(dollars, "rate above $5000 — UPS connector may be returning junk").toBeLessThanOrEqual(5000);

  if ((band as { expectsNoWhiteGlove?: boolean }).expectsNoWhiteGlove) {
    await expect(rateRow).toBeVisible();
    await expect(page.getByText(/white[-\s]?glove/i)).toHaveCount(0);
  }
}

// ── Console error capture (G5) ───────────────────────────────────────────────
function collectConsoleErrors(page: Page): () => string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return () => errors;
}

// ── Setup ────────────────────────────────────────────────────────────────────
test.beforeAll(() => {
  if (!isRealShipping || !isLiveDeployment) return;
  fs.mkdirSync(SS, { recursive: true });
});

test.setTimeout(120_000);

// ════════════════════════════════════════════════════════════════════════════
// Per-band suites (stages 1–4)
// ════════════════════════════════════════════════════════════════════════════
for (const band of MATRIX) {
  test.describe(`cf-oi01 / ${band.band} (${band.shipTo.zip})`, () => {
    test.skip(!isRealShipping || !isLiveDeployment, SHIPPING_SKIP);

    test.beforeEach(async () => {
      const baseUrl = process.env.BASE_URL ?? "";
      const slugs = await ensureCatalogSlugs(baseUrl);
      test.skip(
        slugs.size > 0 && !slugs.has(band.slug),
        `slug "${band.slug}" not in catalog — override with E2E_${band.band.toUpperCase().replace(/-/g, "_")}_SLUG`,
      );
    });

    // ── Stage 1: PDP → add-to-cart ──────────────────────────────────────────
    test("stage 1 — PDP loads + add-to-cart opens cart drawer", async ({ page }) => {
      await addToCart(page, band.slug);
      await expect(page.getByTestId("cart-line-price").first()).toBeVisible();
      await page.screenshot({ path: `${SS}/${band.band}-01-cart.png`, fullPage: true });
    });

    // ── Stage 2: Live UPS rates ──────────────────────────────────────────────
    test("stage 2 — Wix checkout returns live UPS rates (G2 + G7)", async ({ page }) => {
      // Best-effort UPS API call interception — failure here is non-fatal;
      // the load-bearing assertion is the visible rate row + dollar bounds.
      page
        .waitForResponse(
          (r) => /\.wix\.com\/.*(rate|shipping|checkout)/i.test(r.url()),
          { timeout: 15_000 },
        )
        .catch(() => null);

      await addToCart(page, band.slug);
      await navigateToWixCheckout(page);

      await page.getByLabel(/zip|postal/i).first().fill(band.shipTo.zip);
      const stateField = page.getByLabel(/state/i).first();
      if (await stateField.isVisible().catch(() => false)) {
        await stateField.fill(band.shipTo.state);
      }

      await assertRateRow(page, band);
      await page.screenshot({ path: `${SS}/${band.band}-02-rates.png`, fullPage: true });
    });

    // ── Stage 3: Stripe Elements iframe mounts (G1) ─────────────────────────
    test("stage 3 — Wix-hosted checkout + Stripe Elements iframe (G1)", async ({ page }) => {
      await addToCart(page, band.slug);
      await navigateToWixCheckout(page);

      expect(page.url()).toMatch(WIX_CHECKOUT_HOST_RE);

      const stripeIframe = page
        .locator('iframe[src*="stripe.com"], iframe[name^="__privateStripe"]')
        .first();
      await expect(stripeIframe).toBeAttached({ timeout: 30_000 });
      await page.screenshot({ path: `${SS}/${band.band}-03-payment.png`, fullPage: true });
    });

    // ── Stage 4: Stripe test card payment ────────────────────────────────────
    test("stage 4 — Stripe test card completes order", async ({ page }) => {
      test.skip(!isStripeTest, STRIPE_SKIP);

      await addToCart(page, band.slug);
      await navigateToWixCheckout(page);

      // Fill Stripe Elements iframe. Playwright can frameLocator into the
      // iframe once it's attached (confirmed by stage 3). Number, exp, CVC,
      // and billing zip are separate inputs inside the iframe.
      const stripeFrame = page
        .frameLocator('iframe[src*="stripe.com"], iframe[name^="__privateStripe"]')
        .first();

      await stripeFrame.locator('[placeholder*="1234"], [autocomplete*="cc-number"]').fill(
        STRIPE_TEST_CARD.number,
      );
      await stripeFrame
        .locator('[placeholder*="MM"], [autocomplete*="cc-exp"]')
        .fill(STRIPE_TEST_CARD.exp);
      await stripeFrame
        .locator('[placeholder*="CVC"], [autocomplete*="cc-csc"]')
        .fill(STRIPE_TEST_CARD.cvc);
      const billingZip = stripeFrame.locator('[placeholder*="ZIP"], [autocomplete*="postal-code"]');
      if (await billingZip.isVisible().catch(() => false)) {
        await billingZip.fill(STRIPE_TEST_CARD.zip);
      }

      await page.getByRole("button", { name: /pay|place order|complete/i }).click();

      // Wait for Wix order-confirmation redirect (URL contains orderId or
      // "thank-you" or "order-confirmation").
      await page.waitForURL(/order[-_]?confirm|thank[-_]?you|orderId=/i, {
        timeout: 60_000,
      });
      await page.screenshot({ path: `${SS}/${band.band}-04-confirmation.png`, fullPage: true });
    });

    // ── Stage 5: Stripe webhook → Wix order ─────────────────────────────────
    test("stage 5 — webhook side-effect (cf-oi01.1)", async () => {
      // Webhook verification is async + side-effecting. Run as a separate
      // out-of-band probe after stage 4 — tracked in cf-oi01.1 follow-up.
      test.fixme(
        true,
        "cf-oi01.1: poll Wix orders by created-after timestamp from stage 4; not chained inline",
      );
    });
  });
}

// ════════════════════════════════════════════════════════════════════════════
// PayPal sandbox (G4) — separate describe block, same gate + Stripe gate
// ════════════════════════════════════════════════════════════════════════════
test.describe("cf-oi01 / PayPal sandbox (G4)", () => {
  test.skip(!isRealShipping || !isLiveDeployment || !isStripeTest, STRIPE_SKIP);

  test("PayPal popup opens + sandbox login completes order", async ({
    page,
    context,
  }: {
    page: Page;
    context: BrowserContext;
  }) => {
    await addToCart(page, PARCEL.slug);
    await navigateToWixCheckout(page);

    // PayPal opens a popup from the Wix-hosted checkout page.
    const [popup] = await Promise.all([
      context.waitForEvent("page", { timeout: 30_000 }),
      page.getByRole("button", { name: /paypal/i }).click(),
    ]);

    await popup.waitForLoadState("domcontentloaded", { timeout: 30_000 });
    expect(popup.url()).toMatch(/paypal\.com/i);

    // Sandbox login — credentials must be wired by Stilgar before this runs.
    const emailInput = popup.locator("#email");
    if (await emailInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await emailInput.fill(process.env.PAYPAL_SANDBOX_EMAIL ?? "");
      await popup.locator("#password").fill(process.env.PAYPAL_SANDBOX_PASSWORD ?? "");
      await popup.getByRole("button", { name: /log in/i }).click();
    }

    // Approve payment inside the popup.
    await popup.getByRole("button", { name: /pay now|approve/i }).click({ timeout: 30_000 });

    // Popup closes and Wix redirects to order-confirmation.
    await page.waitForURL(/order[-_]?confirm|thank[-_]?you|orderId=/i, { timeout: 60_000 });
    await page.screenshot({ path: `${SS}/paypal-confirmation.png`, fullPage: true });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Viewport sweep (G5) — smoke-level: PDP + cart drawer at 3 widths
// ════════════════════════════════════════════════════════════════════════════
test.describe("cf-oi01 / viewport sweep — no console errors (G5)", () => {
  test.skip(!isRealShipping || !isLiveDeployment, SHIPPING_SKIP);

  for (const vp of VIEWPORTS) {
    test(`${vp.name} (${vp.width}px) — PDP + cart, zero console errors`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const getErrors = collectConsoleErrors(page);

      await addToCart(page, PARCEL.slug);

      const errors = getErrors();
      expect(
        errors,
        `Console errors at ${vp.width}px:\n${errors.join("\n")}`,
      ).toHaveLength(0);

      await page.screenshot({
        path: `${SS}/viewport-${vp.name}-01-cart.png`,
        fullPage: true,
      });
    });
  }
});
