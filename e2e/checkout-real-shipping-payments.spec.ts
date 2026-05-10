/**
 * cf-oi01: real-shipping + payments E2E on carolina-futons-web Vercel preview.
 *
 * STATUS: scaffolding only. Body is wired to skip until the run env is fully
 * set up by melania (sole browser driver per memory) — see "Blocking inputs"
 * below. The spec exists now so the structure is in place; melania flips
 * the flag + adds creds when ready and the suite executes.
 *
 * Path A decision (Stilgar 2026-05-04): pull UPS creds from Wix staging
 * dashboard → drop into Vercel env for carolina-futons-web → drive e2e on
 * Vercel preview using LIVE UPS rates and real payment processors (test
 * mode first).
 *
 * ## Blocking inputs (Stilgar to provide before the suite runs)
 *  - UPS_CLIENT_ID, UPS_CLIENT_SECRET, UPS_ACCOUNT_NUMBER (from Wix staging)
 *  - production vs sandbox UPS keys confirmation
 *  - Stripe secret + publishable (test mode first)
 *  - PayPal client + secret (sandbox first)
 *  - ship-from = 824 Locust St, Hendersonville NC 28792
 *  - test SKUs (cheapest live or fixture per band)
 *
 * ## Run (when unblocked)
 *   CF_E2E_REAL_SHIPPING=1 \
 *   BASE_URL=https://carolina-futons-web.vercel.app \
 *   E2E_PARCEL_SLUG=<slug-light> \
 *   E2E_LTL_SLUG=<slug-frame> \
 *   E2E_FREIGHT_SLUG=<slug-heavy> \
 *   npx playwright test e2e/checkout-real-shipping-payments.spec.ts
 *
 * ## Acceptance (per bead)
 *   - All 3 shipping bands return live UPS rates (no fixtures)
 *   - Stripe test card completes order in test mode
 *   - Stripe webhook → Vercel function → Wix order created
 *   - Screenshots + network logs captured at each step
 *
 * ## Out of scope here
 *   - Pulling creds from Wix dashboard (manual step, see bead Stage 1)
 *   - `vercel env` add operations (manual step, see bead Stage 2)
 *   - 3DS challenge handling (Stilgar approves any 3DS at run-time)
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";

// ── Run gates ────────────────────────────────────────────────────────────────
// Requires explicit opt-in. CI never runs this. Local runs must point at a
// real preview/prod deployment so live UPS + Stripe APIs respond — running
// against the dev server would either fixture-stub the calls or fail.
const isRealRun = process.env.CF_E2E_REAL_SHIPPING === "1";
const isLiveDeployment =
  !!process.env.BASE_URL &&
  process.env.BASE_URL !== "http://localhost:3000" &&
  process.env.BASE_URL !== "http://127.0.0.1:3000";

const skipReason =
  "cf-oi01: requires CF_E2E_REAL_SHIPPING=1 + BASE_URL pointing at a real deployment + UPS/Stripe creds wired on Vercel env. See spec docblock for blocking inputs.";

// ── Test matrix (3 ZIPs × 1 SKU each) ────────────────────────────────────────
// Pull real slugs at runtime via env so the suite isn't pinned to a specific
// catalog state. Defaults are Stilgar-approved placeholder slugs that exist
// on the cfw catalog — override per run if those go OOS.
const PARCEL = {
  band: "parcel",
  slug: process.env.E2E_PARCEL_SLUG ?? "fabric-swatch-kit",
  shipTo: { zip: "28792", state: "NC", city: "Hendersonville" },
  // Parcel band: UPS Ground via small-package rates. Expect 1 UPS rate row.
  expectedRateLabel: /ups|ground/i,
};

const LTL = {
  band: "ltl",
  slug: process.env.E2E_LTL_SLUG ?? "kingston-futon-frame",
  shipTo: { zip: "30309", state: "GA", city: "Atlanta" },
  // LTL band: 70–499 lb — UPS Ground returns nothing usable, so a freight
  // carrier (XPO / Estes / etc.) should be the only rate. White-glove must
  // NOT appear (Atlanta is outside the white-glove zone).
  expectedRateLabel: /ltl|freight/i,
  expectsNoWhiteGlove: true,
};

const FREIGHT_NC_WHITEGLOVE = {
  band: "freight-whiteglove",
  slug: process.env.E2E_FREIGHT_SLUG ?? "ranchero-murphy-cabinet-bed",
  shipTo: { zip: "28792", state: "NC", city: "Hendersonville" },
  // Heavy + NC: the white-glove rate row should appear (1–2 day window).
  expectedRateLabel: /white[-\s]?glove/i,
};

const FREIGHT_FAR = {
  band: "freight-far",
  slug: process.env.E2E_FREIGHT_SLUG ?? "ranchero-murphy-cabinet-bed",
  shipTo: { zip: "90210", state: "CA", city: "Beverly Hills" },
  // Heavy + far ZIP: pure freight, no white-glove (out of zone).
  expectedRateLabel: /freight/i,
  expectsNoWhiteGlove: true,
};

const MATRIX = [PARCEL, LTL, FREIGHT_NC_WHITEGLOVE, FREIGHT_FAR] as const;

// ── Stripe test card (run-time stage 4) ──────────────────────────────────────
// 4242… is the Stripe test "Visa, no 3DS" card. 3DS-required + declined cards
// land in their own follow-up beads (cf-oi01.2 / cf-oi01.3) so this scaffold
// stays focused on the happy path.
const STRIPE_TEST_CARD = {
  number: "4242 4242 4242 4242",
  exp: "12/34",
  cvc: "123",
  zip: "28792",
};

// ── Screenshot directory (per band) ──────────────────────────────────────────
const SCREENSHOT_ROOT = "e2e-screenshots/cf-oi01";

test.beforeAll(() => {
  if (!isRealRun || !isLiveDeployment) return;
  fs.mkdirSync(SCREENSHOT_ROOT, { recursive: true });
});

test.setTimeout(120_000);

// ── Per-band suites ──────────────────────────────────────────────────────────
for (const band of MATRIX) {
  test.describe(`cf-oi01 ${band.band} (${band.shipTo.zip})`, () => {
    test.skip(!isRealRun || !isLiveDeployment, skipReason);

    test(`stage 1 — PDP loads + add-to-cart`, async ({ page }) => {
      await page.goto(`/products/${band.slug}`);
      await expect(
        page.getByRole("button", { name: /add to cart/i }).first(),
      ).toBeEnabled({ timeout: 20_000 });
      await page.getByRole("button", { name: /add to cart/i }).first().click();
      // Cart drawer opens optimistically; wait for the line to settle so the
      // subsequent /cart navigation isn't racing the visitor cart write.
      await expect(page.getByTestId("cart-line-price").first()).toBeVisible({
        timeout: 20_000,
      });
      await page.screenshot({
        path: `${SCREENSHOT_ROOT}/${band.band}-01-cart.png`,
        fullPage: true,
      });
    });

    test(`stage 2 — checkout init returns live UPS rates`, async ({ page }) => {
      await page.goto(`/products/${band.slug}`);
      await page.getByRole("button", { name: /add to cart/i }).first().click();
      await expect(page.getByTestId("cart-line-price").first()).toBeVisible();
      await page.goto("/cart");

      // Drive through the address form. Selectors are anchor-style so they
      // survive copy edits in the cart UI; tighten when the checkout layout
      // stabilizes.
      await page.getByLabel(/zip/i).first().fill(band.shipTo.zip);
      const stateInput = page.getByLabel(/state/i).first();
      if (await stateInput.isVisible().catch(() => false)) {
        await stateInput.fill(band.shipTo.state);
      }

      // Capture the network response from the rates endpoint so the test
      // fails LOUDLY if UPS creds aren't actually firing on the preview.
      const ratesResponse = page.waitForResponse(
        (resp) => /\/api\/.*shipping|\/_functions\/.*rate/i.test(resp.url()),
        { timeout: 30_000 },
      );
      await page.getByRole("button", { name: /get rates|estimate|continue/i }).first().click();
      const rates = await ratesResponse;
      expect(rates.status()).toBe(200);

      // The matching rate label must appear in the UI — proves the API
      // response was rendered, not just received.
      await expect(page.getByText(band.expectedRateLabel)).toBeVisible({
        timeout: 15_000,
      });
      if ((band as { expectsNoWhiteGlove?: boolean }).expectsNoWhiteGlove) {
        await expect(page.getByText(/white[-\s]?glove/i)).toHaveCount(0);
      }

      await page.screenshot({
        path: `${SCREENSHOT_ROOT}/${band.band}-02-rates.png`,
        fullPage: true,
      });
    });

    test(`stage 3 — payment page reachable (Stripe test mode)`, async ({ page }) => {
      // Drive to the Stripe-hosted checkout. Card fill + submit happens in
      // stage 4 below; this stage only verifies the redirect / payment frame
      // mounts so a future regression in the redirect handoff fails here
      // rather than mid-card-entry.
      await page.goto(`/products/${band.slug}`);
      await page.getByRole("button", { name: /add to cart/i }).first().click();
      await expect(page.getByTestId("cart-line-price").first()).toBeVisible();
      await page.goto("/checkout");

      // Wait for either the inline Stripe Elements iframe OR a redirect to
      // checkout.stripe.com — depending on the integration mode in effect.
      await expect.poll(
        async () => {
          const iframe = page.locator('iframe[src*="stripe"]').first();
          if (await iframe.isVisible().catch(() => false)) return "elements";
          if (/stripe\.com/.test(page.url())) return "redirect";
          return null;
        },
        { timeout: 30_000 },
      ).not.toBeNull();
      await page.screenshot({
        path: `${SCREENSHOT_ROOT}/${band.band}-03-payment.png`,
        fullPage: true,
      });
    });

    test(`stage 4 — Stripe test card completes order`, async ({ page }) => {
      // Skipped until stage 3 is observed green on a real run — running stage
      // 4 with a broken stage 3 just hangs on the iframe locator. Melania
      // un-skips after a clean stage 3 sweep.
      test.fixme(true, "stage 4 unblocked by melania once stage 3 is green on preview");
      // Pseudo-flow once unblocked:
      //   1. fill Stripe iframe with STRIPE_TEST_CARD
      //   2. submit
      //   3. wait for /order-confirmation OR Wix redirect with order id
      //   4. assert order id visible
      //   5. screenshot stage4-confirmation.png
      void STRIPE_TEST_CARD;
    });

    test(`stage 5 — Stripe webhook → Vercel function → Wix order`, async () => {
      // Webhook verification is async + side-effecting. Run as a separate
      // out-of-band probe (poll Wix orders by created-after timestamp from
      // stage 4) rather than chain after the page test.
      test.fixme(true, "stage 5 verifies webhook side-effect, runs after stage 4 completes — wired in cf-oi01.1");
    });
  });
}
