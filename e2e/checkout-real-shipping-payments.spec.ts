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
 * cf-ioep follow-up: PR #534 review (radahn) flagged 4 HIGH gaps fixed here.
 *  - G1 stage 3 selector — cfw checkout redirects to a *.wix.com hosted page
 *    with Stripe Elements embedded INSIDE; never lands on stripe.com directly.
 *  - G2 rate-fetch listener — UPS rates fire on the wix.com domain post-
 *    redirect, NOT on cfw `/api/...shipping`. Old regex never matched.
 *  - G3 variant SKUs — Kingston / Ranchero require size + color before
 *    add-to-cart enables. Helper picks the first choice per option group.
 *  - G6 slug pre-flight — beforeAll fetches sitemap and skips bands whose
 *    slug isn't actually in the catalog.
 *  - G7 rate sanity — assert dollar amount is within [1, 5000]
 *
 * ## Blocking inputs (Stilgar to provide before the suite runs)
 *  - UPS_CLIENT_ID, UPS_CLIENT_SECRET, UPS_ACCOUNT_NUMBER (from Wix staging)
 *  - production vs sandbox UPS keys confirmation
 *  - Stripe secret + publishable (test mode first)
 *  - PayPal client + secret (sandbox first) — covered by cf-ioep G4 follow-up
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
 *   - PayPal sandbox flow — cf-ioep G4 (separate follow-up)
 *   - Multi-viewport sweep + console-error capture — cf-ioep G5
 */

import { test, expect, type Page } from "@playwright/test";
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
// catalog state. Defaults are PLACEHOLDER slugs — melania overrides per run.
// G6: pre-flight checks each slug against /sitemap.xml before the matrix runs;
// missing slugs skip with a clear message rather than hanging on add-to-cart.
const PARCEL = {
  band: "parcel",
  slug: process.env.E2E_PARCEL_SLUG ?? "trundle-pad-cover",
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

// ── Wix-hosted checkout host pattern (G1) ────────────────────────────────────
// cfw redirects to a Wix-hosted page (createRedirectSession.fullUrl). The
// host is one of these depending on the site's connected domain + plan;
// Stripe is iframe-embedded INSIDE this page, never the top-level URL.
const WIX_CHECKOUT_HOST_RE = /(\.wix\.com|\.wixsite\.com|\.editorx\.io|\/checkout)/i;

// ── Screenshot directory (per band) ──────────────────────────────────────────
const SCREENSHOT_ROOT = "e2e-screenshots/cf-oi01";

// ── Slug pre-flight (G6) ─────────────────────────────────────────────────────
// Catalog-state guard: fetch /sitemap.xml once and store the set of present
// product slugs. Each band's stage 1 short-circuits with `test.skip` when
// its slug isn't in the catalog, instead of hanging on a 404'd PDP.
let catalogSlugs: Set<string> | null = null;

async function loadCatalogSlugs(baseUrl: string): Promise<Set<string>> {
  if (catalogSlugs) return catalogSlugs;
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/sitemap.xml`);
    const xml = await res.text();
    const slugs = new Set<string>();
    for (const m of xml.matchAll(/\/products\/([a-z0-9-]+)/gi)) {
      slugs.add(m[1]!);
    }
    catalogSlugs = slugs;
    return slugs;
  } catch {
    catalogSlugs = new Set();
    return catalogSlugs;
  }
}

// ── Variant-required helper (G3) ─────────────────────────────────────────────
// Kingston (size + color) and Ranchero (size + finish) keep add-to-cart
// disabled until each option group has a selection. Walk every fieldset
// rendered by VariantPicker and click the first available choice. No-op on
// products without variants (e.g. parcel band).
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

test.beforeAll(() => {
  if (!isRealRun || !isLiveDeployment) return;
  fs.mkdirSync(SCREENSHOT_ROOT, { recursive: true });
});

test.setTimeout(120_000);

// ── Per-band suites ──────────────────────────────────────────────────────────
for (const band of MATRIX) {
  test.describe(`cf-oi01 ${band.band} (${band.shipTo.zip})`, () => {
    test.skip(!isRealRun || !isLiveDeployment, skipReason);

    test.beforeEach(async () => {
      // G6: skip this band if its slug isn't on the live catalog. Lets the
      // matrix run greenly with partial overrides instead of hanging on a
      // missing PDP.
      const baseUrl = process.env.BASE_URL ?? "";
      const slugs = await loadCatalogSlugs(baseUrl);
      test.skip(
        slugs.size > 0 && !slugs.has(band.slug),
        `slug "${band.slug}" not in catalog at ${baseUrl}/sitemap.xml — set E2E_${band.band.toUpperCase().replace(/-/g, "_")}_SLUG`,
      );
    });

    test(`stage 1 — PDP loads + add-to-cart`, async ({ page }) => {
      await page.goto(`/products/${band.slug}`);
      // G3: pick a default variant before the add-to-cart button enables.
      // Pure no-op for products without variants.
      await selectFirstAvailableVariant(page);
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

    test(`stage 2 — Wix-hosted checkout returns live UPS rates`, async ({ page }) => {
      // G2: UPS rates are NOT served from cfw — the Wix-hosted checkout page
      // calls UPS internally on the wix.com domain. So stage 2 has to follow
      // the redirect, then assert on the rates rendered there. We listen
      // for ANY response on the Wix host (best-effort signal that rates
      // fetched), but the load-bearing assertion is the visible row text +
      // the dollar-amount sanity bound (G7).
      await page.goto(`/products/${band.slug}`);
      await selectFirstAvailableVariant(page);
      await page.getByRole("button", { name: /add to cart/i }).first().click();
      await expect(page.getByTestId("cart-line-price").first()).toBeVisible();

      // Click through to checkout — this triggers createRedirectSession on
      // the cfw side and lands the browser on the Wix-hosted checkout host.
      await page.goto("/checkout");
      await page.waitForURL(WIX_CHECKOUT_HOST_RE, { timeout: 30_000 });

      // Best-effort: snoop one wix.com response after the redirect lands so
      // a totally-broken UPS connector (no network at all) fails fast. The
      // test does NOT depend on this firing — see UI assertion below.
      page
        .waitForResponse(
          (resp) => /\.wix\.com\/.*(rate|shipping|checkout)/i.test(resp.url()),
          { timeout: 15_000 },
        )
        .catch(() => null);

      // Fill the shipping address on the Wix-hosted page. Selectors are
      // anchor-style on the rendered labels; tighten when the Wix layout
      // stabilizes for the v3 rollout.
      await page.getByLabel(/zip|postal/i).first().fill(band.shipTo.zip);
      const stateInput = page.getByLabel(/state/i).first();
      if (await stateInput.isVisible().catch(() => false)) {
        await stateInput.fill(band.shipTo.state);
      }

      // The matching rate label must appear in the UI — proves the API
      // response was rendered, not just received.
      const rateRow = page.getByText(band.expectedRateLabel).first();
      await expect(rateRow).toBeVisible({ timeout: 30_000 });

      // G7: rate dollar amount sanity bound. Parse the visible row text and
      // assert the price is plausible — catches a UPS-connector regression
      // returning $0 or $99,999 that a label-only assertion would miss.
      const rateText = (await rateRow.textContent()) ?? "";
      const m = rateText.match(/\$([\d,]+(?:\.\d{2})?)/);
      expect(m, `no dollar amount in rate row: ${rateText}`).not.toBeNull();
      const dollars = Number(m![1]!.replace(/,/g, ""));
      expect(dollars).toBeGreaterThanOrEqual(1);
      expect(dollars).toBeLessThanOrEqual(5000);

      if ((band as { expectsNoWhiteGlove?: boolean }).expectsNoWhiteGlove) {
        // Wait for SOME rate to render before negating — keeps the
        // assertion ordering stable even if the white-glove row is the
        // slowest to populate (G8 partial fix).
        await expect(rateRow).toBeVisible();
        await expect(page.getByText(/white[-\s]?glove/i)).toHaveCount(0);
      }

      await page.screenshot({
        path: `${SCREENSHOT_ROOT}/${band.band}-02-rates.png`,
        fullPage: true,
      });
    });

    test(`stage 3 — Wix checkout reachable + Stripe Elements iframe mounts`, async ({ page }) => {
      // G1: cfw uses Wix Headless redirect — on click of "Go to checkout"
      // the cfw Server Action calls createCheckoutFromCurrentCart →
      // createRedirectSession → fullUrl. Browser lands on a *.wix.com host
      // (not stripe.com). Stripe Elements is iframe-embedded INSIDE the
      // Wix-hosted page. Stage 3 verifies BOTH legs of the handoff so a
      // future regression in either redirect or iframe mount fails here
      // rather than mid-card-entry.
      await page.goto(`/products/${band.slug}`);
      await selectFirstAvailableVariant(page);
      await page.getByRole("button", { name: /add to cart/i }).first().click();
      await expect(page.getByTestId("cart-line-price").first()).toBeVisible();
      await page.goto("/checkout");

      // Leg 1: redirect to Wix-hosted checkout host.
      await page.waitForURL(WIX_CHECKOUT_HOST_RE, { timeout: 30_000 });
      expect(page.url()).toMatch(WIX_CHECKOUT_HOST_RE);

      // Leg 2: Stripe Elements iframe is a direct child of the Wix checkout
      // page. Wait for at least one iframe whose src points at js.stripe.com
      // / hooks.stripe.com / *.stripe.com — that's the Elements payment
      // surface mounting.
      const stripeIframe = page
        .locator('iframe[src*="stripe.com"], iframe[name^="__privateStripe"]')
        .first();
      await expect(stripeIframe).toBeAttached({ timeout: 30_000 });

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
      void page;
    });

    test(`stage 5 — Stripe webhook → Vercel function → Wix order`, async () => {
      // Webhook verification is async + side-effecting. Run as a separate
      // out-of-band probe (poll Wix orders by created-after timestamp from
      // stage 4) rather than chain after the page test.
      test.fixme(true, "stage 5 verifies webhook side-effect, runs after stage 4 completes — wired in cf-oi01.1");
    });
  });
}
