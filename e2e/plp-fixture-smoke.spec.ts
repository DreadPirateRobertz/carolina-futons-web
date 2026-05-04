/**
 * PLP fixture-mode smoke tests — cf-3qt.2.14
 *
 * Covers all 5 PLP routes using NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1:
 *   /shop/futon-frames        — 2 fixture products (Kingston $399 in-stock,
 *                               Sedona $549 out-of-stock)
 *   /shop/mattresses          — 1 fixture product (Mesa Futon Mattress $119, in-stock)
 *   /shop/platform-beds       — 1 fixture product (Monterey $1,699, in-stock)
 *   /shop/murphy-cabinet-beds — 1 fixture product (Asheville $849, in-stock)
 *   /shop/mattresses-sale     — derived / on-sale filter; 0 fixture products
 *                               (no fixture defines discountedPrice)
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/plp-fixture-smoke.spec.ts
 *
 * Fixture data: src/lib/fixtures/products.ts + src/lib/fixtures/collections.ts
 */

import { test, expect, type Page } from "@playwright/test";

const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

const PLP_TIMEOUT = 15_000;

async function waitForPlpControls(page: Page) {
  await page.waitForSelector("select#plp-sort", { timeout: PLP_TIMEOUT });
}

// ── futon-frames PLP ─────────────────────────────────────────────────────────

test.describe("/shop/futon-frames — fixture mode", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(30_000);

  test.beforeEach(async ({ page }) => {
    await page.goto("/shop/futon-frames");
    await waitForPlpControls(page);
  });

  test("renders 2 fixture product cards (kingston + sedona)", async ({ page }) => {
    const cards = page.locator('[data-slot="product-card"]');
    await expect(cards).toHaveCount(2);
    await expect(page.getByText(/kingston/i)).toBeVisible();
    await expect(page.getByText(/sedona/i)).toBeVisible();
  });

  test("product count header shows 2 products", async ({ page }) => {
    const header = page.locator("p", { hasText: /\d+ products?/ });
    await expect(header).toBeVisible();
    expect(parseInt((await header.textContent()) ?? "0", 10)).toBe(2);
  });

  test("sort by price-asc updates URL", async ({ page }) => {
    await page.selectOption("select#plp-sort", "price-asc");
    await page.waitForURL(/sort=price-asc/);
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(2);
  });

  test("in-stock filter keeps only kingston (sedona is out-of-stock)", async ({
    page,
  }) => {
    await page.check("input#plp-inStock");
    await page.click("button[type=submit]");
    await page.waitForURL(/inStock=1/);
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(1);
    await expect(page.getByText(/kingston/i)).toBeVisible();
  });

  test("price filter $500+ hides kingston ($399), shows sedona ($549)", async ({
    page,
  }) => {
    await page.fill("input#plp-priceMin", "500");
    await page.click("button[type=submit]");
    await page.waitForURL(/priceMin=500/);
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(1);
    await expect(page.getByText(/sedona/i)).toBeVisible();
  });

  test("price filter under $200 hides both fixture frames", async ({ page }) => {
    await page.fill("input#plp-priceMax", "200");
    await page.click("button[type=submit]");
    await page.waitForURL(/priceMax=200/);
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(0);
  });

  test("page title contains Futon Frames", async ({ page }) => {
    await expect(page).toHaveTitle(/futon frames/i);
  });
});

// ── mattresses PLP ───────────────────────────────────────────────────────────

test.describe("/shop/mattresses — fixture mode", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(30_000);

  test.beforeEach(async ({ page }) => {
    await page.goto("/shop/mattresses");
    await waitForPlpControls(page);
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
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(0);
  });
});

// ── platform-beds PLP ────────────────────────────────────────────────────────

test.describe("/shop/platform-beds — fixture mode", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(30_000);

  test.beforeEach(async ({ page }) => {
    await page.goto("/shop/platform-beds");
    await waitForPlpControls(page);
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
    await waitForPlpControls(page);
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

  test("sort by name-asc updates URL", async ({ page }) => {
    await page.selectOption("select#plp-sort", "name-asc");
    await page.waitForURL(/sort=name-asc/);
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
    await expect(
      page.getByText(/no mattresses are on sale right now/i),
    ).toBeVisible({ timeout: PLP_TIMEOUT });
  });

  test("count header shows 0 products on empty-sale page", async ({ page }) => {
    await page.goto("/shop/mattresses-sale");
    // Wait for empty-state copy as load anchor (PLPControls always renders count)
    await expect(
      page.getByText(/no mattresses are on sale right now/i),
    ).toBeVisible({ timeout: PLP_TIMEOUT });
    const header = page.locator("p", { hasText: /\d+ products?/ });
    await expect(header).toBeVisible();
    expect(parseInt((await header.textContent()) ?? "-1", 10)).toBe(0);
  });
});
