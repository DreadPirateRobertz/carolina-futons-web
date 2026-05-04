/**
 * /shop/sale PLP E2E smoke spec — cf-3qt.8.27
 *
 * Dedicated coverage for the derived sale PLP (PR #389). Runs in fixture
 * mode: 3 fixture products have discountedPrice < price (Kingston $399→$319,
 * Monterey $1,699→$1,399, Mesa $119→$89), so the on-sale filter yields 3 cards.
 *
 * Acceptance criteria from the bead:
 *   1. /shop/sale returns 200
 *   2. Page heading contains "Sale"
 *   3. Sale badge (strikethrough + red discounted price) visible on ≥ 1 card
 *   4. Breadcrumb shows "Sale"
 *   5. No console errors
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/sale-plp.spec.ts
 */

import { test, expect, type ConsoleMessage } from "@playwright/test";

const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

const PAGE_TIMEOUT = 20_000;

test.describe("/shop/sale PLP — fixture mode", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(35_000);

  // ── 1. HTTP 200 ─────────────────────────────────────────────────────────────

  test("GET /shop/sale returns HTTP 200", async ({ page }) => {
    const res = await page.goto("/shop/sale", { timeout: PAGE_TIMEOUT });
    expect(res?.status()).toBe(200);
  });

  // ── 2. Page heading ──────────────────────────────────────────────────────────

  test("page h1 contains 'Sale'", async ({ page }) => {
    await page.goto("/shop/sale", { timeout: PAGE_TIMEOUT });
    await page.waitForSelector("select#plp-sort", { timeout: PAGE_TIMEOUT });
    await expect(page.getByRole("heading", { level: 1, name: /sale/i })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
  });

  // ── 3. Sale badge ────────────────────────────────────────────────────────────

  test("at least 1 product card shows a strikethrough + red discounted price", async ({
    page,
  }) => {
    await page.goto("/shop/sale", { timeout: PAGE_TIMEOUT });
    await page.waitForSelector("select#plp-sort", { timeout: PAGE_TIMEOUT });

    // Sale badge: strikethrough original price alongside red discounted price.
    // ProductCard renders these as: span.line-through + span.text-red-600
    const saleBadge = page
      .locator('[data-slot="product-card"]')
      .filter({ has: page.locator("span.text-red-600") })
      .first();

    await expect(saleBadge).toBeVisible({ timeout: PAGE_TIMEOUT });

    // Verify the strikethrough is also present on the same card
    const strikethrough = saleBadge.locator("span.line-through");
    await expect(strikethrough).toBeVisible();
  });

  // ── 4. Breadcrumb ────────────────────────────────────────────────────────────

  test("breadcrumb nav contains a 'Sale' item", async ({ page }) => {
    await page.goto("/shop/sale", { timeout: PAGE_TIMEOUT });
    await page.waitForSelector("select#plp-sort", { timeout: PAGE_TIMEOUT });

    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumb).toBeVisible({ timeout: PAGE_TIMEOUT });
    await expect(breadcrumb.getByText(/^Sale$/i)).toBeVisible();
  });

  // ── 5. No console errors ─────────────────────────────────────────────────────

  test("page loads with no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg: ConsoleMessage) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err: Error) => errors.push(err.message));

    await page.goto("/shop/sale", { timeout: PAGE_TIMEOUT });
    await page.waitForSelector("select#plp-sort", { timeout: PAGE_TIMEOUT });

    expect(errors, `Console errors: ${errors.join("; ")}`).toHaveLength(0);
  });

  // ── Bonus: fixture product count ─────────────────────────────────────────────

  test("shows 3 on-sale fixture products (kingston + monterey + mesa)", async ({
    page,
  }) => {
    await page.goto("/shop/sale", { timeout: PAGE_TIMEOUT });
    await page.waitForSelector("select#plp-sort", { timeout: PAGE_TIMEOUT });

    const cards = page.locator('[data-slot="product-card"]');
    await expect(cards).toHaveCount(3);
    await expect(page.getByText(/kingston/i)).toBeVisible();
    await expect(page.getByText(/monterey/i)).toBeVisible();
    await expect(page.getByText(/mesa/i)).toBeVisible();
  });
});
