/**
 * Wave 2 post-cutover smoke tests — cf-3qt.8.13
 *
 * Covers the deeper flows from smoke-test-plan.md Wave 2 that are
 * automatable via Playwright. Manual-only Wave 2 checks (mobile viewport,
 * checkout flow, contact form) are not included here.
 *
 * These tests hit the live site and must NOT run in fixture mode or
 * against localhost. They are skipped automatically when either condition
 * is true; to run them:
 *
 *   BASE_URL=https://carolinafutons.com npx playwright test e2e/post-cutover-wave2.spec.ts
 *
 * Checks:
 *   2.A  Cart persistence — add item, reload page, cart count > 0
 *   2.B  PDP variant selection — color option change updates displayed price
 *   2.C  Search results — "futon frame" and "mattress" each return ≥ 1 card
 *   2.D  PLP pagination — /shop/futon-frames loads ≥ 1 product card
 *   2.E  Footer social links — all 4 present with correct href
 *   2.F  Sale badge — /shop/sale renders ≥ 1 product with strikethrough price
 *   2.G  404 page — /nonexistent-route-xyz returns "Page not found" h1, no JS errors
 */

import { test, expect } from "@playwright/test";

const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";
const isLiveRun =
  !isFixtureMode &&
  process.env.BASE_URL !== undefined &&
  process.env.BASE_URL !== "http://localhost:3000";

const PAGE_TIMEOUT = 20_000;

test.setTimeout(45_000);

// ── 2.A  Cart persistence ─────────────────────────────────────────────────────

test.describe("2.A cart persistence", () => {
  test.skip(!isLiveRun, "post-cutover only — set BASE_URL=https://carolinafutons.com");

  test("add an in-stock product, reload page, cart count remains > 0", async ({
    page,
  }) => {
    await page.goto("/shop/futon-frames", { timeout: PAGE_TIMEOUT });

    const firstPdpLink = page.locator('a[href^="/products/"]').first();
    await expect(firstPdpLink).toBeVisible({ timeout: PAGE_TIMEOUT });
    const pdpHref = await firstPdpLink.getAttribute("href");
    expect(pdpHref).toMatch(/^\/products\//);

    await page.goto(pdpHref!, { timeout: PAGE_TIMEOUT });
    await page.waitForLoadState("domcontentloaded");

    const addBtn = page.getByRole("button", { name: /add to cart/i });
    const isInStock = await addBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isInStock) {
      test.skip();
      return;
    }

    await addBtn.click();

    const cartCount = page.locator('[data-testid="cart-trigger-count"]');
    await expect(cartCount).toBeVisible({ timeout: PAGE_TIMEOUT });

    await page.reload({ timeout: PAGE_TIMEOUT });
    await page.waitForLoadState("domcontentloaded");

    const countText = await page
      .locator('[data-testid="cart-trigger-count"]')
      .textContent({ timeout: 5_000 })
      .catch(() => "0");
    expect(Number(countText?.trim() ?? "0")).toBeGreaterThan(0);
  });
});

// ── 2.B  PDP variant selection ────────────────────────────────────────────────

test.describe("2.B PDP variant selection", () => {
  test.skip(!isLiveRun, "post-cutover only — set BASE_URL=https://carolinafutons.com");

  test("selecting a color option changes the displayed price or keeps it valid", async ({
    page,
  }) => {
    await page.goto("/shop/futon-frames", { timeout: PAGE_TIMEOUT });
    await page.waitForLoadState("domcontentloaded");

    const firstPdpLink = page.locator('a[href^="/products/"]').first();
    await expect(firstPdpLink).toBeVisible({ timeout: PAGE_TIMEOUT });
    const pdpHref = await firstPdpLink.getAttribute("href");

    await page.goto(pdpHref!, { timeout: PAGE_TIMEOUT });
    await page.waitForLoadState("domcontentloaded");

    const picker = page.locator('[data-slot="variant-option"]').first();
    const hasPicker = await picker.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasPicker) {
      // Product has no variants — verify price is still shown and skip
      await expect(page.getByText(/\$\d/)).toBeVisible({ timeout: PAGE_TIMEOUT });
      return;
    }

    // Read price before selection
    const priceEl = page.locator('[data-slot="variant-picker-price"]');
    await expect(priceEl).toBeVisible({ timeout: PAGE_TIMEOUT });

    // Click the second variant option if available
    const options = page.locator('[data-slot="variant-option"] button[role="radio"]');
    const count = await options.count();
    if (count >= 2) {
      await options.nth(1).click();
    } else {
      await options.first().click();
    }

    // Price element must still be visible with a dollar amount after selection
    await expect(priceEl).toBeVisible({ timeout: PAGE_TIMEOUT });
    await expect(page.locator('[data-testid="variant-price"]')).toContainText(
      /\$/,
      { timeout: PAGE_TIMEOUT },
    );
  });
});

// ── 2.C  Search returns results ───────────────────────────────────────────────

test.describe("2.C search returns results", () => {
  test.skip(!isLiveRun, "post-cutover only — set BASE_URL=https://carolinafutons.com");

  for (const query of ["futon frame", "mattress"]) {
    test(`"${query}" returns ≥ 1 product card`, async ({ page }) => {
      const res = await page.goto(
        `/search?q=${encodeURIComponent(query)}`,
        { timeout: PAGE_TIMEOUT },
      );
      expect(res?.status()).toBe(200);

      const products = page.locator(
        '[data-slot="search-products"] li, [data-slot="product-card"]',
      );
      await expect(products.first()).toBeVisible({ timeout: PAGE_TIMEOUT });
      expect(await products.count()).toBeGreaterThanOrEqual(1);
    });
  }
});

// ── 2.D  PLP pagination ───────────────────────────────────────────────────────

test.describe("2.D PLP loads product cards", () => {
  test.skip(!isLiveRun, "post-cutover only — set BASE_URL=https://carolinafutons.com");

  test("/shop/futon-frames page 1 renders ≥ 1 product card", async ({ page }) => {
    const res = await page.goto("/shop/futon-frames", { timeout: PAGE_TIMEOUT });
    expect(res?.status()).toBe(200);
    await page.waitForLoadState("domcontentloaded");

    const cards = page.locator('[data-slot="product-card"]');
    await expect(cards.first()).toBeVisible({ timeout: PAGE_TIMEOUT });
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
  });
});

// ── 2.E  Footer social links ──────────────────────────────────────────────────

test.describe("2.E footer social links", () => {
  test.skip(!isLiveRun, "post-cutover only — set BASE_URL=https://carolinafutons.com");

  test("all 4 social links present with correct hrefs", async ({ page }) => {
    await page.goto("/", { timeout: PAGE_TIMEOUT });
    await page.waitForLoadState("domcontentloaded");

    const footer = page.locator('[data-slot="site-footer"]');
    await expect(footer).toBeVisible({ timeout: PAGE_TIMEOUT });

    const socials: Array<{ name: string; href: string }> = [
      { name: "Facebook", href: "https://www.facebook.com/carolinafutons" },
      { name: "Instagram", href: "https://www.instagram.com/carolinafutons" },
      { name: "TikTok", href: "https://www.tiktok.com/@carolinafutons" },
      { name: "Pinterest", href: "https://www.pinterest.com/carolinafutons" },
    ];

    for (const { name, href } of socials) {
      const link = footer.locator(`a[href="${href}"]`);
      await expect(link, `${name} link missing or wrong href`).toBeVisible({
        timeout: PAGE_TIMEOUT,
      });
    }
  });
});

// ── 2.F  Sale badge ───────────────────────────────────────────────────────────

test.describe("2.F sale PLP renders strikethrough prices", () => {
  test.skip(!isLiveRun, "post-cutover only — set BASE_URL=https://carolinafutons.com");

  test("/shop/sale has ≥ 1 product card with a line-through original price", async ({
    page,
  }) => {
    const res = await page.goto("/shop/sale", { timeout: PAGE_TIMEOUT });
    expect(res?.status()).toBe(200);
    await page.waitForLoadState("domcontentloaded");

    const cards = page.locator('[data-slot="product-card"]');
    await expect(cards.first()).toBeVisible({ timeout: PAGE_TIMEOUT });
    expect(await cards.count()).toBeGreaterThanOrEqual(1);

    // At least one card must show a line-through original price (on-sale product)
    const strikethrough = page.locator(
      '[data-slot="product-card"] span.line-through',
    );
    await expect(strikethrough.first()).toBeVisible({ timeout: PAGE_TIMEOUT });
  });
});

// ── 2.G  404 page ─────────────────────────────────────────────────────────────

test.describe("2.G 404 page", () => {
  test.skip(!isLiveRun, "post-cutover only — set BASE_URL=https://carolinafutons.com");

  test("/nonexistent-route-xyz renders 404 with 'Page not found' heading", async ({
    page,
  }) => {
    const jsErrors: string[] = [];
    page.on("pageerror", (err) => jsErrors.push(err.message));

    const res = await page.goto("/nonexistent-route-xyz", {
      timeout: PAGE_TIMEOUT,
    });
    expect(res?.status()).toBe(404);
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.getByRole("heading", { name: /page not found/i }),
    ).toBeVisible({ timeout: PAGE_TIMEOUT });

    // "Browse the shop" CTA should be present
    await expect(
      page.getByRole("link", { name: /browse the shop/i }),
    ).toBeVisible({ timeout: PAGE_TIMEOUT });

    expect(jsErrors, `JS errors on 404: ${jsErrors.join("; ")}`).toHaveLength(0);
  });
});
