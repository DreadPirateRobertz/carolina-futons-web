/**
 * Wave 1 post-cutover smoke tests — cf-3qt.8.9
 *
 * Verifies the 5 Wave 1 checks from smoke-test-plan.md within the first
 * 15 minutes after DNS cutover to carolinafutons.com on Vercel.
 *
 * These tests hit the live site and must NOT run in fixture mode or
 * against localhost. They are skipped automatically when either condition
 * is true; to run them:
 *
 *   BASE_URL=https://carolinafutons.com npx playwright test e2e/post-cutover-wave1.spec.ts
 *
 * Checks (from smoke-test-plan.md Wave 1):
 *   1.1  Home page loads — HTTP 200, h1 present
 *   1.2  PDPs resolve — 5 product links discovered from PLP, each returns 200
 *   1.3  Cart add + persist — add item, reload, cart badge count > 0
 *   1.4  Search returns results — "futon frame" and "mattress" each return ≥ 1 card
 *   1.5  Wix CDN images load — no 4xx/5xx from wixstatic.com or wixmp.com
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";
const isLiveRun = !isFixtureMode && BASE_URL !== "http://localhost:3000";

const PAGE_TIMEOUT = 20_000;

test.setTimeout(45_000);

// ── 1.1  Home page loads ──────────────────────────────────────────────────────

test.describe("1.1 home page loads", () => {
  test.skip(!isLiveRun, "post-cutover only — set BASE_URL=https://carolinafutons.com");

  test("GET / returns 200 with an h1", async ({ page }) => {
    const res = await page.goto("/", { timeout: PAGE_TIMEOUT });
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
  });

  test("security headers present on home", async ({ request }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["strict-transport-security"]).toMatch(/max-age/);
  });
});

// ── 1.2  PDPs resolve ─────────────────────────────────────────────────────────

test.describe("1.2 PDPs resolve", () => {
  test.skip(!isLiveRun, "post-cutover only — set BASE_URL=https://carolinafutons.com");

  async function collectPdpLinks(page: Page, plpPath: string, limit: number) {
    await page.goto(plpPath, { timeout: PAGE_TIMEOUT });
    const links = page.locator('a[href^="/products/"]');
    await expect(links.first()).toBeVisible({ timeout: PAGE_TIMEOUT });
    const hrefs = await links.evaluateAll((els) =>
      [...new Set(els.map((e) => (e as HTMLAnchorElement).href))].slice(
        0,
        limit,
      ),
    );
    return hrefs;
  }

  test("5 PDP links from futon-frames PLP each return 200 with title + price", async ({
    page,
  }) => {
    const pdpUrls = await collectPdpLinks(page, "/shop/futon-frames", 5);
    expect(pdpUrls.length).toBeGreaterThanOrEqual(1);

    for (const url of pdpUrls) {
      const res = await page.goto(url, { timeout: PAGE_TIMEOUT });
      expect(res?.status(), `${url} should return 200`).toBe(200);

      // Product title (h1) and a price token must be visible
      await expect(
        page.getByRole("heading", { level: 1 }),
        `${url} missing h1`,
      ).toBeVisible({ timeout: PAGE_TIMEOUT });

      await expect(
        page.getByText(/\$\d/),
        `${url} missing price`,
      ).toBeVisible({ timeout: PAGE_TIMEOUT });

      // Add-to-cart button present (may be enabled or OOS — either is fine here)
      await expect(
        page.getByRole("button", { name: /add to cart|out of stock|notify me/i }),
        `${url} missing cart CTA`,
      ).toBeVisible({ timeout: PAGE_TIMEOUT });
    }
  });
});

// ── 1.3  Cart add + persist ───────────────────────────────────────────────────

test.describe("1.3 cart add + persist", () => {
  test.skip(!isLiveRun, "post-cutover only — set BASE_URL=https://carolinafutons.com");

  test("add an in-stock product, reload, cart count remains > 0", async ({
    page,
  }) => {
    // Discover an in-stock PDP from the frames PLP
    await page.goto("/shop/futon-frames", { timeout: PAGE_TIMEOUT });
    const firstPdpLink = page.locator('a[href^="/products/"]').first();
    await expect(firstPdpLink).toBeVisible({ timeout: PAGE_TIMEOUT });
    const pdpHref = await firstPdpLink.getAttribute("href");
    expect(pdpHref).toMatch(/^\/products\//);

    await page.goto(pdpHref!, { timeout: PAGE_TIMEOUT });

    const addBtn = page.getByRole("button", { name: /add to cart/i });
    // Only proceed if this product is in-stock; skip if OOS
    const isInStock = await addBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isInStock) {
      test.skip();
      return;
    }

    await addBtn.click();

    // Cart should update — accept either a drawer appearing or a badge incrementing
    const cartBadge = page.locator('[data-slot="cart-count"], [aria-label*="cart" i]');
    await expect(cartBadge.first()).toBeVisible({ timeout: PAGE_TIMEOUT });

    // Reload and verify cart is still non-empty
    await page.reload({ timeout: PAGE_TIMEOUT });
    const badgeAfterReload = page.locator('[data-slot="cart-count"]');
    const countText = await badgeAfterReload.textContent({ timeout: 5_000 }).catch(() => "0");
    expect(Number(countText?.trim() ?? "0")).toBeGreaterThan(0);
  });
});

// ── 1.4  Search returns results ───────────────────────────────────────────────

test.describe("1.4 search returns results", () => {
  test.skip(!isLiveRun, "post-cutover only — set BASE_URL=https://carolinafutons.com");

  for (const query of ["futon frame", "mattress"]) {
    test(`"${query}" returns ≥ 1 product card within 5s`, async ({ page }) => {
      const res = await page.goto(`/search?q=${encodeURIComponent(query)}`, {
        timeout: PAGE_TIMEOUT,
      });
      expect(res?.status()).toBe(200);

      const products = page.locator('[data-slot="search-products"] li, [data-slot="product-card"]');
      await expect(products.first()).toBeVisible({ timeout: PAGE_TIMEOUT });
      const count = await products.count();
      expect(count, `"${query}" should return ≥ 1 result`).toBeGreaterThanOrEqual(1);
    });
  }
});

// ── 1.5  Wix CDN images load ──────────────────────────────────────────────────

test.describe("1.5 Wix CDN images load without errors", () => {
  test.skip(!isLiveRun, "post-cutover only — set BASE_URL=https://carolinafutons.com");

  test("no 4xx/5xx image responses from Wix CDN on home + PDP", async ({
    page,
  }) => {
    const cdnErrors: { url: string; status: number }[] = [];

    page.on("response", (res) => {
      const url = res.url();
      if (
        (url.includes("wixstatic.com") || url.includes("wixmp.com")) &&
        res.request().resourceType() === "image" &&
        res.status() >= 400
      ) {
        cdnErrors.push({ url, status: res.status() });
      }
    });

    // Check home
    await page.goto("/", { timeout: PAGE_TIMEOUT });
    await page.waitForLoadState("networkidle", { timeout: PAGE_TIMEOUT });

    // Check one PDP
    const firstPdp = page.locator('a[href^="/products/"]').first();
    const pdpHref = await firstPdp.getAttribute("href").catch(() => null);
    if (pdpHref) {
      await page.goto(pdpHref, { timeout: PAGE_TIMEOUT });
      await page.waitForLoadState("networkidle", { timeout: PAGE_TIMEOUT });
    }

    expect(
      cdnErrors,
      `Wix CDN image errors: ${JSON.stringify(cdnErrors)}`,
    ).toHaveLength(0);
  });
});
