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
 *       localStorage is itself, so the rail is absent — and the PDP itself
 *       is verified to have rendered, so the absence is meaningful).
 *   (3) (1) and (2) repeated at 375px and 1280px viewports — bead AC #3.
 *
 * Requires fixture mode — PDPs must load without Wix.
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/pdp-recently-viewed.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

const FIRST_SLUG = "kingston-futon-frame";
const FIRST_NAME = "Kingston Futon Frame";
const SECOND_SLUG = "asheville-murphy-bed";
const SECOND_NAME = "Asheville Murphy Cabinet Bed";

const STORAGE_KEY = "cf:recently-viewed:v1";
const RAIL_SELECTOR = '[data-slot="pdp-recently-viewed"]';

// One-shot init script: clears storage exactly once per page (per test) on
// the first navigation, then self-disables via a sentinel so subsequent
// navigations within the same test preserve whatever PdpRecentlyViewed wrote.
// This avoids the race where landing on a PDP and clearing afterwards
// competes with the component's mount-time useEffect.
const SENTINEL_KEY = "__pdp_rv_test_initialized";

async function clearStorageOnFirstNav(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, sentinel }: { key: string; sentinel: string }) => {
      try {
        if (window.localStorage.getItem(sentinel)) return;
        window.localStorage.removeItem(key);
        window.localStorage.setItem(sentinel, "1");
      } catch {
        // noop — localStorage is unavailable in some sandboxes; tests will
        // surface the real failure via their assertions, not here.
      }
    },
    { key: STORAGE_KEY, sentinel: SENTINEL_KEY },
  );
}

async function pollStoredSlugs(page: Page): Promise<readonly string[]> {
  const result = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Array<{ slug?: string }>;
      return parsed.map((p) => p.slug ?? "");
    } catch {
      return null;
    }
  }, STORAGE_KEY);
  return result ?? [];
}

test.setTimeout(30_000);

const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "desktop-1280", width: 1280, height: 900 },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`PdpRecentlyViewed — PDP rail @ ${vp.name}`, () => {
    test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test.beforeEach(async ({ page }) => {
      await clearStorageOnFirstNav(page);
    });

    test("(1) second PDP shows first product in recently-viewed rail", async ({
      page,
    }) => {
      // Visit the first PDP — useEffect writes Kingston to localStorage.
      // Anchor on the H1 so a 5xx or fixture-resolution failure fails the
      // test here rather than masquerading as an empty rail.
      await page.goto(`/products/${FIRST_SLUG}`);
      await expect(
        page.getByRole("heading", { level: 1, name: FIRST_NAME }),
      ).toBeVisible();

      // Verify the storage write landed AND contains exactly Kingston —
      // a not-null payload of garbage would otherwise pass.
      await expect.poll(() => pollStoredSlugs(page), { timeout: 5_000 }).toEqual([
        FIRST_SLUG,
      ]);

      // Navigate to the second PDP. Anchor again, then assert the rail
      // shows Kingston as a link to its slug.
      await page.goto(`/products/${SECOND_SLUG}`);
      await expect(
        page.getByRole("heading", { level: 1, name: SECOND_NAME }),
      ).toBeVisible();

      const rail = page.locator(RAIL_SELECTOR);
      await expect(rail).toBeVisible({ timeout: 5_000 });

      const firstTile = rail.getByRole("link", { name: FIRST_NAME });
      await expect(firstTile).toBeVisible();
      await expect(firstTile).toHaveAttribute("href", `/products/${FIRST_SLUG}`);
    });

    test("(2) current product is excluded from its own rail", async ({
      page,
    }) => {
      // Visit Kingston only — single entry in storage IS Kingston, which
      // is also the current product. The rail filters out the current
      // product and returns null when the resulting list is empty.
      await page.goto(`/products/${FIRST_SLUG}`);
      // Positive load anchor: prove the PDP rendered before asserting the
      // rail's absence. Without this anchor, a broken PDP route would
      // satisfy `toHaveCount(0)` for the wrong reason.
      await expect(
        page.getByRole("heading", { level: 1, name: FIRST_NAME }),
      ).toBeVisible();

      // Confirm Kingston is the only entry in storage.
      await expect.poll(() => pollStoredSlugs(page), { timeout: 5_000 }).toEqual([
        FIRST_SLUG,
      ]);

      // Empty list (after current-product filter) → component returns null.
      // No rail in the DOM, no "You recently viewed" landmark exposed to AT.
      await expect(page.locator(RAIL_SELECTOR)).toHaveCount(0);
      await expect(
        page.getByRole("heading", { name: /you recently viewed/i }),
      ).toHaveCount(0);
    });
  });
}
