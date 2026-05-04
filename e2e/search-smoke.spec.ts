/**
 * /search page E2E smoke tests — cf-3qt.14
 *
 * Three cases required by the bead acceptance criteria:
 *   1. ?q=kingston  — fixture mode returns ≥1 product card
 *   2. ?q=zzznomatch — no results renders the empty-state section
 *   3. No ?q param   — guided empty state with search form + suggestion chips
 *
 * In fixture mode searchPosts() will catch the missing Wix client and return [].
 * That means tests 1–2 only assert on product results; blog articles are not
 * checked here (tested at unit level in SearchPage.test.tsx).
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/search-smoke.spec.ts
 */

import { test, expect } from "@playwright/test";

const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

const PAGE_TIMEOUT = 15_000;

// ── Guided empty state (no q) ────────────────────────────────────────────────

test.describe("/search — no query param", () => {
  test.setTimeout(30_000);

  test("renders search heading + form + suggestion chips", async ({ page }) => {
    await page.goto("/search", { timeout: PAGE_TIMEOUT });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /search/i,
    );
    await expect(page.getByRole("search")).toBeVisible();
    await expect(page.locator('[data-slot="search-suggestions"]')).toBeVisible();
    // At least one suggestion chip links back to /search?q=…
    const chips = page.locator('[data-slot="search-suggestions"] a');
    await expect(chips.first()).toBeVisible();
    expect(
      await chips
        .first()
        .getAttribute("href")
        .then((h) => h?.startsWith("/search?q=")),
    ).toBe(true);
  });
});

// ── Fixture-mode: ?q=kingston ─────────────────────────────────────────────────

test.describe("/search?q=kingston — fixture mode", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(30_000);

  test("returns at least one product result for 'kingston'", async ({
    page,
  }) => {
    await page.goto("/search?q=kingston", { timeout: PAGE_TIMEOUT });
    const section = page.locator('[data-slot="search-products"]');
    await expect(section).toBeVisible();
    const items = section.locator("li");
    await expect(items).toHaveCount(1);
    await expect(section.getByText(/kingston/i)).toBeVisible();
  });

  test("product link navigates to /products/:slug", async ({ page }) => {
    await page.goto("/search?q=kingston", { timeout: PAGE_TIMEOUT });
    const link = page
      .locator('[data-slot="search-products"] a')
      .first();
    const href = await link.getAttribute("href");
    expect(href).toMatch(/^\/products\//);
  });

  test("result count text mentions '1 product'", async ({ page }) => {
    await page.goto("/search?q=kingston", { timeout: PAGE_TIMEOUT });
    // The count line: "Showing 1 product and 0 articles for …"
    await expect(page.getByText(/1 product/i)).toBeVisible();
  });

  test("no-results slot is absent when products found", async ({ page }) => {
    await page.goto("/search?q=kingston", { timeout: PAGE_TIMEOUT });
    await expect(
      page.locator('[data-slot="search-no-results"]'),
    ).not.toBeVisible();
  });
});

// ── Fixture-mode: ?q=zzznomatch ───────────────────────────────────────────────

test.describe("/search?q=zzznomatch — fixture mode", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(30_000);

  test("renders the no-results empty state", async ({ page }) => {
    await page.goto("/search?q=zzznomatch", { timeout: PAGE_TIMEOUT });
    const noResults = page.locator('[data-slot="search-no-results"]');
    await expect(noResults).toBeVisible();
    await expect(page.getByText(/no results for/i)).toBeVisible();
    // Query is echoed back inside the empty state
    await expect(noResults).toContainText("zzznomatch");
  });

  test("products and articles sections are absent", async ({ page }) => {
    await page.goto("/search?q=zzznomatch", { timeout: PAGE_TIMEOUT });
    await expect(
      page.locator('[data-slot="search-products"]'),
    ).not.toBeVisible();
    await expect(
      page.locator('[data-slot="search-articles"]'),
    ).not.toBeVisible();
  });

  test("suggestion chips surface to help the user recover", async ({ page }) => {
    await page.goto("/search?q=zzznomatch", { timeout: PAGE_TIMEOUT });
    const suggestions = page.locator('[data-slot="search-suggestions"]');
    await expect(suggestions).toBeVisible();
    await expect(suggestions.locator("a").first()).toBeVisible();
  });
});
