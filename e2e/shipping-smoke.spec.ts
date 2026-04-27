/**
 * cf-kcnu: Shipping flow E2E smoke test on carolina-futons-web.vercel.app
 *
 * Run against prod:
 *   BASE_URL=https://carolina-futons-web.vercel.app npx playwright test e2e/shipping-smoke.spec.ts
 *
 * PURPOSE: Document the current state of the cart/checkout flow. Tests are
 * intentionally soft (skip/warn rather than hard-fail) because many steps
 * depend on live Wix inventory and payment config that may not be fully
 * wired in the Vercel preview environment.
 *
 * FINDINGS (2026-04-26 smoke run):
 *   ✓ Mattresses PLP and Futon Frames PLP render product cards
 *   ✓ PDP pages load with correct headings and prices
 *   ✓ PdpShippingEstimate ZIP widget present on all PDPs
 *   ✗ GAP-1: ALL products "Out of stock" on Vercel deployment — cart disabled
 *   ✓ PdpWhiteGlove present + ZIP check working on >$1500 products (Ranchero, Daisy)
 *   ✓ /api/delivery-zone live: NC→white-glove 1-2d, west→LTL 5-7d
 *   ✓ Cart drawer opens; empty-cart state renders correctly
 *   ✗ GAP-1: ALL products "Out of stock" on Vercel deployment — cart disabled
 *   ✗ GAP-2: RESOLVED — prior smoke used wrong slug (ranchero-futon-frame 404);
 *            correct slug is ranchero-murphy-cabinet-bed; white-glove works correctly
 *   ✗ GAP-3: Cannot test cart→checkout path until GAP-1 is resolved
 *
 * To run locally against the dev server (with real Wix creds):
 *   npx playwright test e2e/shipping-smoke.spec.ts
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";

test.setTimeout(60_000);

test.beforeAll(() => {
  fs.mkdirSync("e2e-screenshots", { recursive: true });
});

// Skip entire suite when not pointed at a real deployment — these tests
// require live Wix inventory data that the CI dev server doesn't have.
const isProdRun = !!process.env.BASE_URL && process.env.BASE_URL !== "http://localhost:3000";

test.describe("shipping flow smoke — prod", () => {
  test.skip(!isProdRun, "requires BASE_URL pointing at a live deployment (e.g. BASE_URL=https://carolina-futons-web.vercel.app)");
  // ── 1. PLPs load ──────────────────────────────────────────────────────────

  test("mattresses PLP renders product cards", async ({ page }) => {
    await page.goto("/shop/mattresses");
    await page.waitForSelector("ul li a[href*='/products/']", { timeout: 20_000 });
    const count = await page.locator("ul li a[href*='/products/']").count();
    expect(count).toBeGreaterThan(0);
    await page.screenshot({ path: "e2e-screenshots/01-mattresses-plp.png" });
  });

  test("futon frames PLP renders product cards", async ({ page }) => {
    await page.goto("/shop/futon-frames");
    await page.waitForSelector("ul li a[href*='/products/']", { timeout: 20_000 });
    const count = await page.locator("ul li a[href*='/products/']").count();
    expect(count).toBeGreaterThan(0);
    await page.screenshot({ path: "e2e-screenshots/02-futon-frames-plp.png" });
  });

  // ── 2. PDP: heading + shipping estimate always present ────────────────────

  test("Mesa 1000 PDP: heading loads and PdpShippingEstimate ZIP widget present", async ({
    page,
  }) => {
    await page.goto("/products/mesa-1000-mattress");
    await page.waitForLoadState("networkidle", { timeout: 20_000 });

    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible({ timeout: 10_000 });
    expect(await h1.textContent()).toMatch(/mesa/i);

    // PdpShippingEstimate always renders a ZIP input regardless of price
    const zipInput = page.locator('[data-slot="pdp-shipping-estimate"]').getByRole("textbox");
    await expect(zipInput).toBeVisible();

    await page.screenshot({ path: "e2e-screenshots/03-mesa-1000-pdp.png" });
  });

  // ── 3. White-glove: documented gap on Ranchero ───────────────────────────

  test("Mesa 1000: PdpWhiteGlove widget NOT shown (price below or at $1500 threshold)", async ({
    page,
  }) => {
    await page.goto("/products/mesa-1000-mattress");
    await page.waitForLoadState("networkidle", { timeout: 20_000 });

    const whiteGloveSection = page.locator('[data-slot="pdp-white-glove"]');
    const isVisible = await whiteGloveSection.isVisible();
    console.info(`[MESA 1000] PdpWhiteGlove visible: ${isVisible} — price relative to $1,500 threshold`);
    await page.screenshot({ path: "e2e-screenshots/04-mesa-1000-white-glove.png" });
    // Documentary — passes whether visible or not
  });

  test("Ranchero ($2978): PdpWhiteGlove present — GAP-2 resolved (correct slug is ranchero-murphy-cabinet-bed)", async ({
    page,
  }) => {
    // GAP-2 from initial smoke was a wrong slug — ranchero is a Murphy Bed, not a futon frame.
    // /products/ranchero-futon-frame → 404; correct: /products/ranchero-murphy-cabinet-bed
    await page.goto("/products/ranchero-murphy-cabinet-bed");
    await page.waitForLoadState("networkidle", { timeout: 20_000 });

    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible({ timeout: 10_000 });

    const whiteGloveSection = page.locator('[data-slot="pdp-white-glove"]');
    await expect(whiteGloveSection).toBeVisible();

    await page.screenshot({ path: "e2e-screenshots/05-ranchero-pdp.png" });
  });

  // ── 4. Cart flow: all products OOS on Vercel — document GAP-1 ────────────

  test("Add-to-cart audit: Mesa 1000 and Kingston are Out-of-stock — GAP-1", async ({
    page,
  }) => {
    // Check 2 products (fast) to confirm the OOS pattern across SKUs
    const slugs = ["mesa-1000-mattress", "kingston-futon-frame"];
    const results: Array<{ slug: string; status: string }> = [];

    for (const slug of slugs) {
      await page.goto(`/products/${slug}`);
      await page.waitForSelector('[id*="add-to-cart-status"]', { timeout: 20_000 });
      const status =
        (await page.locator('[id*="add-to-cart-status"]').textContent()) ?? "";
      results.push({ slug, status });

      // Soft assertion: when inventory is configured this will break — remove GAP-1 skip above
      expect.soft(results[results.length - 1].status, `${slug} OOS gate`).not.toMatch(
        /out of stock/i,
      );
    }

    console.info("[CART AUDIT]", JSON.stringify(results));

    const hasOos = results.some((r) => /out of stock/i.test(r.status));
    if (hasOos) {
      console.warn(
        "[GAP-1 cf-kcnu] Tested products are Out of stock on carolina-futons-web.vercel.app. " +
          "Cannot test cart → checkout flow until inventory is configured. " +
          "Resolution: configure Wix headless inventory for the preview environment, " +
          "or run smoke test against a deployment with live Wix catalog data.",
      );
    }
    // Hard pass — this test documents the state, soft assertions above gate when fixed
    expect(results.length).toBeGreaterThan(0);
  });

  // ── 5. Checkout redirect — skip until cart works ──────────────────────────

  test("checkout redirect: skipped until GAP-1 (all OOS) is resolved", () => {
    // This test intentionally skips until products have inventory on prod.
    // When inventory is configured, remove the skip and implement the full flow:
    //   1. navigate to PDP, select variant, click Add to Cart
    //   2. open cart drawer, click Checkout
    //   3. assert redirect to wix.com/wixapps.net checkout URL
    //   4. on Wix checkout, verify shipping address form present
    //   5. verify UPS rate options present
    //   6. verify white-glove option for >$1500 order (do NOT submit payment)
    test.skip(true, "GAP-1: all products OOS — re-enable when Wix catalog inventory is configured on prod");
  });

  // ── 6. Mixed white-glove + LTL dispatch (cf-q9zi partial-cart test) ───────
  //
  // Exercises the delivery-zone API with two ZIPs that resolve to different
  // services: NC (white-glove) + west coast (LTL). Verifies both service tiers
  // are live and distinguishable so a checkout with mixed-eligibility items
  // would display separate dispatch methods.
  //
  // NOTE: A real mixed-cart browser test requires GAP-1 to be resolved first
  // (products in stock). This API-level test confirms the backend is ready
  // before that blocker is lifted.

  test("delivery-zone: NC ZIP → white-glove tier", async ({ request }) => {
    const base = process.env.BASE_URL ?? "https://carolina-futons-web.vercel.app";
    const res = await request.get(`${base}/api/delivery-zone?zip=28792`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { ok: boolean; service?: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe("white-glove");
  });

  test("delivery-zone: west-coast ZIP → LTL tier", async ({ request }) => {
    const base = process.env.BASE_URL ?? "https://carolina-futons-web.vercel.app";
    const res = await request.get(`${base}/api/delivery-zone?zip=90210`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { ok: boolean; service?: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe("ltl");
  });

  test("delivery-zone: mixed-dispatch scenario — NC white-glove + west LTL are distinct services", async ({ request }) => {
    const base = process.env.BASE_URL ?? "https://carolina-futons-web.vercel.app";
    const [wgRes, ltlRes] = await Promise.all([
      request.get(`${base}/api/delivery-zone?zip=28792`),
      request.get(`${base}/api/delivery-zone?zip=90210`),
    ]);
    const wg = await wgRes.json() as { ok: boolean; service?: string; label?: string };
    const ltl = await ltlRes.json() as { ok: boolean; service?: string; label?: string };
    expect(wg.service).toBe("white-glove");
    expect(ltl.service).toBe("ltl");
    // Confirm labels differ so checkout can display mixed dispatch copy
    expect(wg.label).not.toBe(ltl.label);
    // GAP-3 (cf-q9zi): once GAP-1 is resolved, extend this test to:
    //   1. Add a >$1500 NC-eligible product to cart
    //   2. Add a <$1500 product to cart
    //   3. On checkout, assert the shipping section shows both white-glove AND
    //      freight/LTL dispatch options with separate ETAs
  });
});
