/**
 * ContinueShoppingStrip E2E spec — cf-l6aj.7.2
 *
 * The strip appears on the home page when the user has a recently-viewed
 * PDP in localStorage. PdpRecentlyViewed writes via useEffect on PDP mount.
 *
 * Tests:
 *   (1) Fresh session — strip absent (no prior browsing)
 *   (2) After PDP visit — strip visible with that product tile
 *   (3) Aria: section not in DOM when empty (no landmark exposed to AT)
 *
 * Requires fixture mode — the PDP must load a product without Wix.
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/continue-shopping-strip.spec.ts
 */

import { test, expect } from "@playwright/test";

const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

// Kingston is the canonical fixture PDP — always available in fixture mode.
const FIXTURE_SLUG = "kingston-futon-frame";
const FIXTURE_NAME = "Kingston Futon Frame";
const PDP_URL = `/products/${FIXTURE_SLUG}`;
const STORAGE_KEY = "cf:recently-viewed:v1";
const STRIP_SELECTOR = '[data-slot="continue-shopping-strip"]';

test.setTimeout(30_000);

test.describe("ContinueShoppingStrip — home page", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");

  test("(1) strip absent on fresh home visit (no prior browsing)", async ({ page }) => {
    // Ensure localStorage is clean before the test.
    await page.goto("/");
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload();

    await expect(page.locator(STRIP_SELECTOR)).toHaveCount(0);
  });

  test("(2) strip visible after visiting a PDP, with that product tile", async ({ page }) => {
    // Clear any residual storage from previous tests.
    await page.goto("/");
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);

    // Visit the fixture PDP — PdpRecentlyViewed useEffect writes to localStorage.
    await page.goto(PDP_URL);
    // Wait for the page to be interactive (effect has fired).
    await page.waitForLoadState("networkidle");
    // Confirm the write landed before navigating away.
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

    // Navigate to home and verify the strip renders.
    await page.goto("/");
    const strip = page.locator(STRIP_SELECTOR);
    await expect(strip).toBeVisible({ timeout: 5_000 });

    // The fixture product tile must appear inside the strip.
    await expect(strip.getByText(FIXTURE_NAME)).toBeVisible();
  });

  test("(2b) strip tile links to the correct PDP", async ({ page }) => {
    // Seed localStorage directly — faster than a real PDP visit.
    await page.goto("/");
    await page.evaluate(
      ({ key, slug, name }) => {
        const item = {
          id: "fixture-kingston-futon-frame",
          slug,
          name,
          viewedAt: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify([item]));
      },
      { key: STORAGE_KEY, slug: FIXTURE_SLUG, name: FIXTURE_NAME },
    );
    await page.reload();

    const strip = page.locator(STRIP_SELECTOR);
    await expect(strip).toBeVisible({ timeout: 5_000 });

    const tileLink = strip.getByRole("link", { name: FIXTURE_NAME });
    await expect(tileLink).toHaveAttribute("href", PDP_URL);
  });

  test("(3) strip section absent from DOM when no items (a11y — no empty landmark)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload();

    // The section must not exist in the DOM at all — an empty <section> with
    // aria-labelledby would still be announced by screen readers as a landmark.
    await expect(page.locator(STRIP_SELECTOR)).toHaveCount(0);

    // No region with the "Continue shopping" label either.
    await expect(
      page.getByRole("region", { name: /continue shopping/i }),
    ).toHaveCount(0);
  });
});
