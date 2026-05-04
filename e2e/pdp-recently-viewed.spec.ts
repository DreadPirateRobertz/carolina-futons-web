/**
 * PdpRecentlyViewed E2E spec — cf-l6aj.9 / cf-j2r7
 *
 * The rail appears on a PDP when localStorage holds at least one previously
 * viewed product that is not the current one. PdpRecentlyViewed writes the
 * current product to localStorage in a useEffect on mount, so the second
 * PDP visit is the first one whose rail can show prior browsing.
 *
 * Tests:
 *   (1) After visiting two PDPs in sequence, the second PDP rail shows the
 *       first product as a tile linked to its slug.
 *   (2) The current product is excluded from the rail (the only entry in
 *       localStorage is itself, so the rail is absent).
 *
 * Requires fixture mode — PDPs must load without Wix.
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/pdp-recently-viewed.spec.ts
 */

import { test, expect } from "@playwright/test";

const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

const FIRST_SLUG = "kingston-futon-frame";
const FIRST_NAME = "Kingston Futon Frame";
const SECOND_SLUG = "asheville-murphy-bed";

const STORAGE_KEY = "cf:recently-viewed:v1";
const RAIL_SELECTOR = '[data-slot="pdp-recently-viewed"]';

test.setTimeout(30_000);

test.describe("PdpRecentlyViewed — PDP rail", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");

  test.beforeEach(async ({ page }) => {
    // Same-origin navigation needed before localStorage is reachable.
    // Land on a PDP (not home) so the test does not depend on home loading
    // — at the time these tests were written /products/* was the smallest
    // route guaranteed available in fixture mode.
    await page.goto(`/products/${FIRST_SLUG}`);
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  });

  test("(1) second PDP shows first product in recently-viewed rail", async ({
    page,
  }) => {
    // Visit the first PDP — useEffect writes Kingston to localStorage.
    await page.goto(`/products/${FIRST_SLUG}`);
    await page.waitForLoadState("networkidle");
    await expect
      .poll(
        () =>
          page.evaluate(
            (key) => localStorage.getItem(key),
            STORAGE_KEY,
          ),
        { timeout: 5_000 },
      )
      .not.toBeNull();

    // Navigate to the second PDP. The rail should now show Kingston since
    // it is in localStorage and is not the current product.
    await page.goto(`/products/${SECOND_SLUG}`);
    const rail = page.locator(RAIL_SELECTOR);
    await expect(rail).toBeVisible({ timeout: 5_000 });

    const firstTile = rail.getByRole("link", { name: FIRST_NAME });
    await expect(firstTile).toBeVisible();
    await expect(firstTile).toHaveAttribute("href", `/products/${FIRST_SLUG}`);
  });

  test("(2) current product is excluded from its own rail", async ({
    page,
  }) => {
    // Visit Kingston only — the single entry in localStorage is Kingston,
    // which is also the current product. The rail filters out the current
    // product, leaving an empty list, so the section is not rendered.
    await page.goto(`/products/${FIRST_SLUG}`);
    await page.waitForLoadState("networkidle");
    await expect
      .poll(
        () =>
          page.evaluate(
            (key) => localStorage.getItem(key),
            STORAGE_KEY,
          ),
        { timeout: 5_000 },
      )
      .not.toBeNull();

    // Confirm Kingston is the only entry in storage.
    const storedSlugs = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw) as Array<{ slug?: string }>;
        return parsed.map((p) => p.slug ?? "");
      } catch {
        return [];
      }
    }, STORAGE_KEY);
    expect(storedSlugs).toEqual([FIRST_SLUG]);

    // Empty list → component returns null. No rail in the DOM, no
    // "You recently viewed" landmark exposed to assistive tech.
    await expect(page.locator(RAIL_SELECTOR)).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /you recently viewed/i }),
    ).toHaveCount(0);
  });
});
