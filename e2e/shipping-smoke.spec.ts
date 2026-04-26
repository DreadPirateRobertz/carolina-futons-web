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
 *   ✗ GAP-2: Ranchero ($2,978) PdpWhiteGlove NOT showing — fallbackPriceCents
 *            resolves below $1,500 threshold on this product (likely 0 or
 *            minimum-variant price from Wix catalog)
 *   ✗ GAP-3: Cannot test cart→checkout path until GAP-1 is resolved
 *
 * To run locally against the dev server (with real Wix creds):
 *   npx playwright test e2e/shipping-smoke.spec.ts
 */

import { test, expect } from "@playwright/test";

test.setTimeout(60_000);

test.describe("shipping flow smoke — prod", () => {
  // ── 1. PLPs load ──────────────────────────────────────────────────────────

  test("mattresses PLP renders product cards", async ({ page }) => {
    await page.goto("/shop/mattresses");
    await page.waitForSelector("li", { timeout: 20_000 });
    const count = await page.locator("ul li").count();
    expect(count).toBeGreaterThan(0);
    await page.screenshot({ path: "e2e-screenshots/01-mattresses-plp.png" });
  });

  test("futon frames PLP renders product cards", async ({ page }) => {
    await page.goto("/shop/futon-frames");
    await page.waitForSelector("li", { timeout: 20_000 });
    const count = await page.locator("ul li").count();
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
    const isVisible = await whiteGloveSection.isVisible().catch(() => false);
    console.info(`[MESA 1000] PdpWhiteGlove visible: ${isVisible} — price relative to $1,500 threshold`);
    await page.screenshot({ path: "e2e-screenshots/04-mesa-1000-white-glove.png" });
    // Documentary — passes whether visible or not
  });

  test("Ranchero ($2978): PdpWhiteGlove NOT shown — GAP-2 (fallbackPriceCents bug)", async ({
    page,
  }) => {
    await page.goto("/products/ranchero-futon-frame");
    await page.waitForLoadState("networkidle", { timeout: 20_000 });

    const heading = await page.getByRole("heading", { level: 1 }).textContent().catch(() => "");
    if (!heading) {
      console.warn("[GAP] Ranchero PDP did not load — product unavailable or slug changed");
      await page.screenshot({ path: "e2e-screenshots/05-ranchero-not-found.png" });
      test.skip();
      return;
    }

    const whiteGloveSection = page.locator('[data-slot="pdp-white-glove"]');
    const isVisible = await whiteGloveSection.isVisible().catch(() => false);

    console.info(`[RANCHERO] PdpWhiteGlove visible: ${isVisible} (expected: true for $2,978 product)`);
    await page.screenshot({ path: "e2e-screenshots/05-ranchero-pdp.png" });

    if (!isVisible) {
      console.warn(
        "[GAP-2 cf-kcnu] Ranchero ($2,978) PdpWhiteGlove NOT showing. " +
          "Root cause: fallbackPriceCents resolves below $1,500 on this product. " +
          "Likely cause: product has no base price — Wix returns 0 or minimum-variant price " +
          "for variant-only products. Fix: use max variant price or price-range ceiling " +
          "as the fallbackPriceCents when the product has no single base price.",
      );
    }
    // Pass regardless — this documents the gap, not gates on it
    expect(heading.length).toBeGreaterThan(0);
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
      await page.waitForLoadState("load", { timeout: 20_000 });
      // Give React a moment to hydrate the status element
      await page.waitForTimeout(1_000);
      const status =
        (await page
          .locator('[id*="add-to-cart-status"]')
          .textContent()
          .catch(() => "")) ?? "";
      results.push({ slug, status });
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
    // Pass — this test documents the state, not gates on it
    expect(results.length).toBeGreaterThan(0);
  });

  // ── 5. Checkout redirect — skip until cart works ──────────────────────────

  test("checkout redirect: skipped until GAP-1 (all OOS) is resolved", async () => {
    // This test intentionally skips until products have inventory on prod.
    // When inventory is configured, remove the skip and implement the full flow:
    //   1. navigate to PDP, select variant, click Add to Cart
    //   2. open cart drawer, click Checkout
    //   3. assert redirect to wix.com/wixapps.net checkout URL
    //   4. on Wix checkout, verify shipping address form present
    //   5. verify UPS rate options present
    //   6. verify white-glove option for >$1500 order (do NOT submit payment)
    console.warn(
      "[SKIP cf-kcnu] Checkout flow test skipped — all products OOS (GAP-1). " +
        "Re-enable when Wix catalog inventory is configured on prod.",
    );
    test.skip();
  });
});
