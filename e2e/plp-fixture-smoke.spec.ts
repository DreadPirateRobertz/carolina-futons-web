/**
 * PLP fixture-mode smoke tests — cf-3qt.2.14
 *
 * Covers all 5 PLP routes using NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1:
 *   /shop/futon-frames        — 2 fixture products (Kingston $619 in-stock,
 *                               Sedona $549 out-of-stock)
 *   /shop/mattresses          — 1 fixture product (Mesa Futon Mattress $119, in-stock)
 *   /shop/platform-beds       — 1 fixture product (Monterey $1,699, in-stock)
 *   /shop/murphy-cabinet-beds — 1 fixture product (Asheville $849, in-stock)
 *   /shop/sofa-beds            — 1 fixture product (Blue Ridge $799, in-stock)
 *   /shop/sale                — derived / on-sale filter sourcing all-products;
 *                               3 products (Kingston $619→$519, Monterey $1,699→$1,399,
 *                               Mesa $119→$89)
 *   /shop/mattresses-sale     — derived / on-sale filter sourcing mattresses;
 *                               1 product (Mesa $119→$89)
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

  test("price filter under $600 hides kingston ($619), shows sedona ($549)", async ({
    page,
  }) => {
    await page.fill("input#plp-priceMax", "600");
    await page.click("button[type=submit]");
    await page.waitForURL(/priceMax=600/);
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

// ── sofa-beds PLP ─────────────────────────────────────────────────────────────

test.describe("/shop/sofa-beds — fixture mode", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(30_000);

  test.beforeEach(async ({ page }) => {
    await page.goto("/shop/sofa-beds");
    await waitForPlpControls(page);
  });

  test("renders 1 product card (blue-ridge-sofa-bed)", async ({ page }) => {
    const cards = page.locator('[data-slot="product-card"]');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText(/blue ridge/i);
  });

  test("product count header shows 1 product", async ({ page }) => {
    const header = page.locator("p", { hasText: /\d+ products?/ });
    await expect(header).toBeVisible();
    expect(parseInt((await header.textContent()) ?? "0", 10)).toBe(1);
  });

  test("page title contains Sofa Beds", async ({ page }) => {
    await expect(page).toHaveTitle(/sofa beds/i);
  });

  test("in-stock filter keeps the 1 in-stock product", async ({ page }) => {
    await page.check("input#plp-inStock");
    await page.click("button[type=submit]");
    await page.waitForURL(/inStock=1/);
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(1);
  });

  test("price filter under $500 hides blue ridge ($799)", async ({ page }) => {
    await page.fill("input#plp-priceMax", "500");
    await page.click("button[type=submit]");
    await page.waitForURL(/priceMax=500/);
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(0);
  });
});

// ── mattresses-sale PLP (derived / mesa on sale) ─────────────────────────────

test.describe("/shop/mattresses-sale — fixture mode", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(30_000);

  test.beforeEach(async ({ page }) => {
    await page.goto("/shop/mattresses-sale");
    await waitForPlpControls(page);
  });

  test("renders 1 on-sale mattress (mesa $119→$89)", async ({ page }) => {
    const cards = page.locator('[data-slot="product-card"]');
    await expect(cards).toHaveCount(1);
    await expect(page.getByText(/mesa/i)).toBeVisible();
  });

  test("product count header shows 1 product", async ({ page }) => {
    const header = page.locator("p", { hasText: /\d+ products?/ });
    await expect(header).toBeVisible();
    expect(parseInt((await header.textContent()) ?? "0", 10)).toBe(1);
  });

  test("in-stock filter keeps the 1 in-stock sale mattress", async ({ page }) => {
    await page.check("input#plp-inStock");
    await page.click("button[type=submit]");
    await page.waitForURL(/inStock=1/);
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(1);
  });
});

// ── /shop/sale PLP (derived / on-sale from all-products) ─────────────────────

test.describe("/shop/sale — fixture mode", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(30_000);

  test.beforeEach(async ({ page }) => {
    await page.goto("/shop/sale");
    await waitForPlpControls(page);
  });

  test("renders 3 on-sale fixture products (kingston + monterey + mesa)", async ({ page }) => {
    const cards = page.locator('[data-slot="product-card"]');
    await expect(cards).toHaveCount(3);
    await expect(page.getByText(/kingston/i)).toBeVisible();
    await expect(page.getByText(/monterey/i)).toBeVisible();
    await expect(page.getByText(/mesa/i)).toBeVisible();
  });

  test("product count header shows 3 products", async ({ page }) => {
    const header = page.locator("p", { hasText: /\d+ products?/ });
    await expect(header).toBeVisible();
    expect(parseInt((await header.textContent()) ?? "0", 10)).toBe(3);
  });

  test("page title contains Sale", async ({ page }) => {
    await expect(page).toHaveTitle(/sale/i);
  });

  test("price filter $1000+ keeps only monterey, hides kingston + mesa", async ({ page }) => {
    await page.fill("input#plp-priceMin", "1000");
    await page.click("button[type=submit]");
    await page.waitForURL(/priceMin=1000/);
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(1);
    await expect(page.getByText(/monterey/i)).toBeVisible();
  });

  test("in-stock filter keeps all 3 on-sale products", async ({ page }) => {
    await page.check("input#plp-inStock");
    await page.click("button[type=submit]");
    await page.waitForURL(/inStock=1/);
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(3);
  });
});
