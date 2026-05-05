/**
 * Price Lock Guarantee E2E (cfw-5jt) — fixture mode.
 *
 * The widget renders below the price on every PDP. First visit shows the
 * trust copy; a return visit within 14 days swaps in the "Locked for X days"
 * countdown reading from localStorage.
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/price-lock-guarantee.spec.ts
 */

import { test, expect } from "@playwright/test";

const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

const FIXTURE_SLUG = "kingston-futon-frame";
const PDP_URL = `/products/${FIXTURE_SLUG}`;
const STORAGE_PREFIX = "cf:pricelock:v1:";
const STORAGE_KEY = `${STORAGE_PREFIX}${FIXTURE_SLUG}`;
const WIDGET_SELECTOR = '[data-testid="price-lock-guarantee"]';
const COUNTDOWN_SELECTOR = '[data-testid="price-lock-countdown"]';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

test.setTimeout(30_000);

test.describe("Price Lock Guarantee — PDP widget (cfw-5jt)", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");

  test("renders below the price with the 14-day trust copy on first view", async ({ page }) => {
    await page.goto(PDP_URL);
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload();

    const widget = page.locator(WIDGET_SELECTOR);
    await expect(widget).toBeVisible();
    await expect(widget).toContainText(/Price locked for 14 days/i);
    await expect(page.locator(COUNTDOWN_SELECTOR)).toHaveCount(0);

    // Sits below the variant-picker price block in DOM order (the AC: "below price").
    const priceBlock = page.locator('[data-slot="variant-picker-price"]').first();
    await expect(priceBlock).toBeVisible();
    const order = await page.evaluate(() => {
      const price = document.querySelector('[data-slot="variant-picker-price"]');
      const lock = document.querySelector('[data-testid="price-lock-guarantee"]');
      if (!price || !lock) return -1;
      // Node.DOCUMENT_POSITION_FOLLOWING = 4
      return price.compareDocumentPosition(lock) & 4 ? 1 : -1;
    });
    expect(order).toBe(1);
  });

  test("writes a first-view timestamp to localStorage", async ({ page }) => {
    await page.goto(PDP_URL);
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload();
    await expect(page.locator(WIDGET_SELECTOR)).toBeVisible();

    const stored = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = Number(stored);
    expect(Number.isFinite(parsed)).toBe(true);
    expect(parsed).toBeGreaterThan(0);
  });

  test("shows the 'Locked for X days' countdown on subsequent views within 14 days", async ({ page }) => {
    await page.goto(PDP_URL);
    // Backdate the first-view to 5 days ago — countdown should read 9 days.
    await page.evaluate(
      ({ key, ts }) => localStorage.setItem(key, String(ts)),
      { key: STORAGE_KEY, ts: Date.now() - 5 * MS_PER_DAY },
    );
    await page.reload();

    const countdown = page.locator(COUNTDOWN_SELECTOR);
    await expect(countdown).toBeVisible();
    await expect(countdown).toContainText(/Locked for 9 days/i);
  });
});
