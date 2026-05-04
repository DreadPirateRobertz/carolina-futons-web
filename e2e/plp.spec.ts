import { test, expect } from "@playwright/test";

test.describe("/shop/futon-frames PLP controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/shop/futon-frames");
    // Wait for the PLP controls to be present
    await page.waitForSelector("select#plp-sort", { timeout: 30_000 });
  });

  test("displays product count header", async ({ page }) => {
    const controls = page.locator("p", { hasText: /\d+ products?/ });
    await expect(controls).toBeVisible();
    const text = await controls.textContent();
    expect(parseInt(text ?? "0", 10)).toBeGreaterThan(0);
  });

  test("sort by price: low to high reorders products", async ({ page }) => {
    // Collect prices before sorting
    const pricesBefore = await page
      .locator("li p.text-sm")
      .allTextContents();

    // Change sort
    await page.selectOption("select#plp-sort", "price-asc");
    await page.waitForURL(/sort=price-asc/);
    await page.waitForSelector("li", { state: "attached" });

    const pricesAfter = await page
      .locator("li p.text-sm")
      .allTextContents();

    // At minimum the URL should have changed and products should still be listed
    expect(page.url()).toContain("sort=price-asc");
    expect(pricesAfter.length).toBeGreaterThan(0);

    // Verify prices are in ascending order (extract numeric values)
    const nums = pricesAfter
      .map((t) => parseFloat(t.replace(/[^0-9.]/g, "")))
      .filter((n) => !isNaN(n));
    for (let i = 1; i < nums.length; i++) {
      expect(nums[i]).toBeGreaterThanOrEqual(nums[i - 1]);
    }
  });

  test("in-stock filter + apply narrows results", async ({ page }) => {
    const totalBefore = await page
      .locator("p", { hasText: /\d+ products?/ })
      .textContent();
    const countBefore = parseInt(totalBefore ?? "0", 10);

    // Check in-stock and apply
    await page.check("input#plp-inStock");
    await page.click("button[type=submit]");
    await page.waitForURL(/inStock=1/);

    const totalAfter = await page
      .locator("p", { hasText: /\d+ products?/ })
      .textContent();
    const countAfter = parseInt(totalAfter ?? "0", 10);

    // Should have same or fewer products (all in stock)
    expect(countAfter).toBeLessThanOrEqual(countBefore);
    expect(page.url()).toContain("inStock=1");
  });

  test("pagination: next → page 2 → prev → back to page 1", async ({
    page,
  }) => {
    // Only run if there's a Next link (enough products)
    const nextLink = page.getByRole("link", { name: /next/i });
    const hasNext = await nextLink.isVisible();
    if (!hasNext) {
      test.skip();
      return;
    }

    await nextLink.click();
    await page.waitForURL(/page=2/);
    expect(page.url()).toContain("page=2");

    // Products should still be showing
    await expect(page.locator("ul li").first()).toBeVisible();

    // Go back
    await page.getByRole("link", { name: /previous/i }).click();
    await page.waitForURL((url) => !url.toString().includes("page=2"));
    expect(page.url()).not.toContain("page=2");
  });
});
