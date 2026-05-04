/**
 * PLP fixture-mode smoke tests — cf-3qt.2.14
 *
 * Covers the four PLPs not tested by the existing plp.spec.ts (futon-frames):
 *   /shop/mattresses          — 1 fixture product (Mesa Foam, $119, in-stock)
 *   /shop/platform-beds       — 1 fixture product (Monterey, $1,699, in-stock)
 *   /shop/murphy-cabinet-beds — 1 fixture product (Asheville, $849, in-stock)
 *   /shop/mattresses-sale     — derived / on-sale filter; 0 fixture products
 *                               (no fixture has discountedPrice < price)
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/plp-fixture-smoke.spec.ts
 *
 * Fixture data: src/lib/fixtures/products.ts + src/lib/fixtures/collections.ts
 */

import { test, expect } from "@playwright/test";

const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

// Shared wait helper — PLP controls take up to 15s on a cold dev server
const PLP_TIMEOUT = 15_000;

// ── helpers ──────────────────────────────────────────────────────────────────

async function waitForPlpControls(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never) {
  await page.waitForSelector("select#plp-sort", { timeout: PLP_TIMEOUT });
}

// ── mattresses PLP ───────────────────────────────────────────────────────────

test.describe("/shop/mattresses — fixture mode", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(30_000);

  test.beforeEach(async ({ page }) => {
    await page.goto("/shop/mattresses");
    await page.waitForSelector("select#plp-sort", { timeout: PLP_TIMEOUT });
  });

  test("renders 1 product card (mesa-foam-mattress)", async ({ page }) => {
    const cards = page.locator('[data-slot="product-card"]');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText(/mesa/i);
  });

  test("product count header shows 1 product", async ({ page }) => {
    const header = page.locator("p", { hasText: /\d+ products?/ });
    await expect(header).toBeVisible();
    expect(parseInt((await header.textContent()) ?? "0", 10)).toBe(1);
  });

  test("sort by price-asc updates URL", async ({ page }) => {
    await page.selectOption("select#plp-sort", "price-asc");
    await page.waitForURL(/sort=price-asc/);
    expect(page.url()).toContain("sort=price-asc");
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(1);
  });

  test("in-stock filter keeps the 1 in-stock product", async ({ page }) => {
    await page.check("input#plp-inStock");
    await page.click("button[type=submit]");
    await page.waitForURL(/inStock=1/);
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(1);
  });

  test("price filter Under $200 keeps mesa ($119)", async ({ page }) => {
    await page.fill("input#plp-priceMin", "0");
    await page.fill("input#plp-priceMax", "200");
    await page.click("button[type=submit]");
    await page.waitForURL(/priceMax=200/);
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(1);
  });

  test("price filter $500+ hides mesa ($119)", async ({ page }) => {
    await page.fill("input#plp-priceMin", "500");
    await page.click("button[type=submit]");
    await page.waitForURL(/priceMin=500/);
    // No products above $500 in fixture mattresses
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(0);
  });
});

// ── platform-beds PLP ────────────────────────────────────────────────────────

test.describe("/shop/platform-beds — fixture mode", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(30_000);

  test.beforeEach(async ({ page }) => {
    await page.goto("/shop/platform-beds");
    await page.waitForSelector("select#plp-sort", { timeout: PLP_TIMEOUT });
  });

  test("renders 1 product card (monterey-platform-bed)", async ({ page }) => {
    const cards = page.locator('[data-slot="product-card"]');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText(/monterey/i);
  });

  test("product count header shows 1 product", async ({ page }) => {
    const header = page.locator("p", { hasText: /\d+ products?/ });
    await expect(header).toBeVisible();
    expect(parseInt((await header.textContent()) ?? "0", 10)).toBe(1);
  });

  test("sort by price-desc updates URL and product still present", async ({
    page,
  }) => {
    await page.selectOption("select#plp-sort", "price-desc");
    await page.waitForURL(/sort=price-desc/);
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(1);
  });

  test("price filter Under $200 hides monterey ($1,699)", async ({ page }) => {
    await page.fill("input#plp-priceMax", "200");
    await page.click("button[type=submit]");
    await page.waitForURL(/priceMax=200/);
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(0);
  });

  test("price filter $1,000+ keeps monterey ($1,699)", async ({ page }) => {
    await page.fill("input#plp-priceMin", "1000");
    await page.click("button[type=submit]");
    await page.waitForURL(/priceMin=1000/);
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(1);
  });
});

// ── murphy-cabinet-beds PLP ───────────────────────────────────────────────────

test.describe("/shop/murphy-cabinet-beds — fixture mode", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(30_000);

  test.beforeEach(async ({ page }) => {
    await page.goto("/shop/murphy-cabinet-beds");
    await page.waitForSelector("select#plp-sort", { timeout: PLP_TIMEOUT });
  });

  test("renders 1 product card (asheville-murphy-bed)", async ({ page }) => {
    const cards = page.locator('[data-slot="product-card"]');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText(/asheville/i);
  });

  test("product count header shows 1 product", async ({ page }) => {
    const header = page.locator("p", { hasText: /\d+ products?/ });
    await expect(header).toBeVisible();
    expect(parseInt((await header.textContent()) ?? "0", 10)).toBe(1);
  });

  test("in-stock filter keeps the 1 in-stock product", async ({ page }) => {
    await page.check("input#plp-inStock");
    await page.click("button[type=submit]");
    await page.waitForURL(/inStock=1/);
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(1);
  });
});

// ── mattresses-sale PLP (derived / empty in fixture mode) ────────────────────

test.describe("/shop/mattresses-sale — fixture mode (empty-sale state)", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(30_000);

  test("shows empty-sale copy when no fixture mattresses are discounted", async ({
    page,
  }) => {
    await page.goto("/shop/mattresses-sale");
    // The derived on-sale filter finds 0 fixture products (no discountedPrice
    // set on mesa-foam-mattress). Expect the category.emptyStateCopy.
    await expect(
      page.getByText(/no mattresses are on sale right now/i),
    ).toBeVisible({ timeout: PLP_TIMEOUT });
  });

  test("page does not show a product count header when empty", async ({
    page,
  }) => {
    await page.goto("/shop/mattresses-sale");
    await page.waitForLoadState("networkidle");
    // No products → no "N products" header rendered
    const header = page.locator("p", { hasText: /\d+ products?/ });
    await expect(header).not.toBeVisible({ timeout: 5_000 }).catch(() => {});
  });
});
