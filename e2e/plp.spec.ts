import { test, expect } from "@playwright/test";

// All tests navigate to a live PLP and interact with server-rendered controls.
// 60s per-test covers slow CI runners + the full round-trip of the Wix product fetch.
const PLP_TIMEOUT = 60_000;

// Stable anchor: every product in the grid carries data-slot="product-card".
// Using this instead of generic `li` / `li p.text-sm` selectors, which can match
// nav or breadcrumb elements and produce intermittent "wrong content" reads.
const PRODUCT_CARDS = '[data-slot="product-card"]';

test.describe("/shop/futon-frames PLP controls", () => {
  test.setTimeout(PLP_TIMEOUT);

  test.beforeEach(async ({ page }) => {
    await page.goto("/shop/futon-frames");
    // Wait for the sort control AND at least one product card — ensures the
    // grid is fully painted before any test assertion runs.
    await page.waitForSelector("select#plp-sort", { timeout: PLP_TIMEOUT });
    await expect(page.locator(PRODUCT_CARDS).first()).toBeVisible({
      timeout: PLP_TIMEOUT,
    });
  });

  test("displays product count header", async ({ page }) => {
    const countP = page.locator("p", { hasText: /\d+ products?/ }).first();
    await expect(countP).toBeVisible();
    const text = await countP.textContent();
    expect(parseInt(text ?? "0", 10)).toBeGreaterThan(0);
  });

  test("sort by price: low to high reorders products", async ({ page }) => {
    const cards = page.locator(PRODUCT_CARDS);

    await page.selectOption("select#plp-sort", "price-asc");
    await page.waitForURL(/sort=price-asc/, { timeout: PLP_TIMEOUT });
    // Wait for the grid to repaint after navigation before reading prices.
    await expect(cards.first()).toBeVisible({ timeout: PLP_TIMEOUT });

    const pricesAfter = await cards.locator("p.text-sm").allTextContents();

    expect(page.url()).toContain("sort=price-asc");
    expect(pricesAfter.length).toBeGreaterThan(0);

    const nums = pricesAfter
      .map((t) => parseFloat(t.replace(/[^0-9.]/g, "")))
      .filter((n) => !isNaN(n) && n > 0);
    for (let i = 1; i < nums.length; i++) {
      expect(nums[i]).toBeGreaterThanOrEqual(nums[i - 1]);
    }
  });

  test("in-stock filter + apply narrows results", async ({ page }) => {
    const countP = page.locator("p", { hasText: /\d+ products?/ }).first();
    await expect(countP).toBeVisible();
    const countBefore = parseInt((await countP.textContent()) ?? "0", 10);

    await page.check("input#plp-inStock");
    await page.click("button[type=submit]");
    await page.waitForURL(/inStock=1/, { timeout: PLP_TIMEOUT });
    // Wait for the count paragraph to reflect the filtered result set.
    await expect(countP).toBeVisible({ timeout: PLP_TIMEOUT });

    const countAfter = parseInt((await countP.textContent()) ?? "0", 10);
    expect(countAfter).toBeLessThanOrEqual(countBefore);
    expect(page.url()).toContain("inStock=1");
  });

  test("pagination: next → page 2 → prev → back to page 1", async ({
    page,
  }) => {
    const nextLink = page.getByRole("link", { name: /next/i });
    if (!(await nextLink.isVisible())) {
      test.skip();
      return;
    }

    await nextLink.click();
    await page.waitForURL(/page=2/, { timeout: PLP_TIMEOUT });
    // Grid must repopulate after navigation.
    await expect(page.locator(PRODUCT_CARDS).first()).toBeVisible({
      timeout: PLP_TIMEOUT,
    });
    expect(page.url()).toContain("page=2");

    await page.getByRole("link", { name: /previous/i }).click();
    await page.waitForURL((url) => !url.toString().includes("page=2"), {
      timeout: PLP_TIMEOUT,
    });
    await expect(page.locator(PRODUCT_CARDS).first()).toBeVisible({
      timeout: PLP_TIMEOUT,
    });
    expect(page.url()).not.toContain("page=2");
  });
});
