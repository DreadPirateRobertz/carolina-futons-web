/**
 * RecentlyViewedStrip E2E spec — cf-l6aj.8.2
 *
 * The strip appears on the home page below FilterFirst when the user has
 * recently-viewed products in localStorage. PdpRecentlyViewed writes on
 * PDP mount; this strip reads the same key.
 *
 * Tests:
 *   (1) Fresh session — strip absent (no prior browsing)
 *   (2) After PDP visit — strip visible below FilterFirst with that product tile
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/recently-viewed-strip.spec.ts
 */

import { test, expect } from "@playwright/test";

const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

const FIXTURE_SLUG = "kingston-futon-frame";
const FIXTURE_NAME = "Kingston Futon Frame";
const PDP_URL = `/products/${FIXTURE_SLUG}`;
const STORAGE_KEY = "cf:recently-viewed:v1";
const STRIP_SELECTOR = '[data-slot="recently-viewed-strip"]';

test.setTimeout(30_000);

test.describe("RecentlyViewedStrip — home page", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");

  test("(1) strip absent on fresh home visit (no prior browsing)", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload();

    await expect(page.locator(STRIP_SELECTOR)).toHaveCount(0);
  });

  test("(2) strip visible after PDP visit, tile links to that product", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);

    // Visit the fixture PDP — PdpRecentlyViewed useEffect writes to localStorage.
    await page.goto(PDP_URL);
    await page.waitForLoadState("networkidle");

    // Return to home page and wait for the strip to appear.
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const strip = page.locator(STRIP_SELECTOR);
    await expect(strip).toBeVisible();
    await expect(strip.getByRole("region", { name: /recently viewed/i })).toBeVisible();

    // The fixture product tile should appear in the strip.
    const tile = strip.getByRole("link", { name: new RegExp(FIXTURE_NAME, "i") });
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAttribute("href", PDP_URL);
  });
});
