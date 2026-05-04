/**
 * /search page E2E smoke tests — cf-3qt.14
 *
 * Three cases required by the bead acceptance criteria:
 *   1. ?q=kingston  — fixture mode returns ≥1 product card
 *   2. ?q=zzznomatch — no results renders the empty-state section
 *   3. No ?q param   — guided empty state with search form + suggestion chips
 *
 * Product results use FIXTURE_PRODUCTS via an explicit USE_FIXTURES guard in
 * searchProducts(). Blog articles: WIX_CLIENT_ID_HEADLESS is unset in fixture
 * mode, so env() throws inside getWixClient(), which searchPosts() catches and
 * returns [] — articles are only tested at unit level in SearchPage.test.tsx.
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/search-smoke.spec.ts
 */

import { test, expect } from "@playwright/test";

const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

const PAGE_TIMEOUT = 15_000;

test.setTimeout(30_000);

// ── Guided empty state (no q) ────────────────────────────────────────────────
// Runs unconditionally — the no-q branch makes zero Wix SDK calls, so no
// credentials are required.

test.describe("/search — no query param", () => {
  test.beforeEach(async ({ page }) => {
    const res = await page.goto("/search", { timeout: PAGE_TIMEOUT });
    expect(res?.status()).toBe(200);
  });

  test("renders search heading + form + suggestion chips", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /^search$/i,
    );
    await expect(page.getByRole("search")).toBeVisible();
    await expect(page.locator('[data-slot="search-suggestions"]')).toBeVisible();
    const chip = page.locator('[data-slot="search-suggestions"] a').first();
    await expect(chip).toBeVisible();
    await expect(chip).toHaveAttribute("href", /^\/search\?q=/);
  });

  test("submitting the search form navigates to /search?q=…", async ({
    page,
  }) => {
    const input = page.getByRole("searchbox");
    await expect(input).toBeVisible();
    await input.fill("futon");
    await input.press("Enter");
    await page.waitForURL(/\/search\?q=futon/, { timeout: PAGE_TIMEOUT });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /search results/i,
    );
  });
});

// ── Fixture-mode: ?q=kingston ─────────────────────────────────────────────────

test.describe("/search?q=kingston — fixture mode", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");

  test.beforeEach(async ({ page }) => {
    const res = await page.goto("/search?q=kingston", { timeout: PAGE_TIMEOUT });
    expect(res?.status()).toBe(200);
  });

  test("returns at least one product card for 'kingston'", async ({ page }) => {
    const section = page.locator('[data-slot="search-products"]');
    await expect(section).toBeVisible();
    const count = await section.locator('li[data-slot="product-card"]').count();
    expect(count).toBeGreaterThanOrEqual(1);
    await expect(section.getByText(/kingston/i)).toBeVisible();
  });

  test("product link navigates to /products/:slug", async ({ page }) => {
    const link = page.locator('[data-slot="search-products"] a').first();
    await expect(link).toHaveAttribute("href", /^\/products\//);
  });

  test("result count text is visible", async ({ page }) => {
    await expect(page.getByText(/1 product/i)).toBeVisible();
  });

  test("no-results slot is absent when products found", async ({ page }) => {
    await expect(
      page.locator('[data-slot="search-no-results"]'),
    ).not.toBeAttached();
  });
});

// ── Fixture-mode: ?q=zzznomatch ───────────────────────────────────────────────

test.describe("/search?q=zzznomatch — fixture mode", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");

  test.beforeEach(async ({ page }) => {
    const res = await page.goto("/search?q=zzznomatch", {
      timeout: PAGE_TIMEOUT,
    });
    expect(res?.status()).toBe(200);
  });

  test("renders the no-results empty state", async ({ page }) => {
    const noResults = page.locator('[data-slot="search-no-results"]');
    await expect(noResults).toBeVisible();
    await expect(page.getByText(/no results for/i)).toBeVisible();
    await expect(noResults).toContainText("zzznomatch");
  });

  test("products and articles sections are absent", async ({ page }) => {
    await expect(
      page.locator('[data-slot="search-products"]'),
    ).not.toBeAttached();
    await expect(
      page.locator('[data-slot="search-articles"]'),
    ).not.toBeAttached();
  });

  test("suggestion chips surface to help the user recover", async ({ page }) => {
    const suggestions = page.locator('[data-slot="search-suggestions"]');
    await expect(suggestions).toBeVisible();
    await expect(suggestions.locator("a").first()).toBeVisible();
  });
});
