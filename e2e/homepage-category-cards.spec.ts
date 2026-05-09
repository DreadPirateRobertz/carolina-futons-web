/**
 * Homepage MascotCategoryCard grid E2E spec — cf-3qt.16.2
 *
 * HomeFeaturedCollections renders 4 MascotCategoryCard elements (bear/deer/fox/owl)
 * in a 2-col → 4-col responsive grid. Each card is a motion.a with:
 *   - data-slot="category-card"
 *   - aria-label matching the category name
 *   - href to /shop/<slug>
 *
 * Tests run unconditionally — the homepage "Shop by category" section is
 * statically rendered from SHOP_CATEGORIES (no Wix SDK calls required).
 *
 * Run with:
 *   npx playwright test e2e/homepage-category-cards.spec.ts
 */

import { test, expect } from "@playwright/test";

const PAGE_TIMEOUT = 15_000;
const CARD_SELECTOR = '[data-slot="category-card"]';

const EXPECTED_CARDS = [
  { label: "Futon Frames",       href: "/shop/futon-frames" },
  { label: "Murphy Cabinet Beds", href: "/shop/murphy-cabinet-beds" },
  { label: "Platform Beds",      href: "/shop/platform-beds" },
  { label: "Mattresses",         href: "/shop/mattresses" },
] as const;

test.setTimeout(30_000);

test.describe("Homepage MascotCategoryCard grid", () => {
  test.beforeEach(async ({ page }) => {
    const res = await page.goto("/", { timeout: PAGE_TIMEOUT });
    expect(res?.status()).toBe(200);
  });

  test("renders all 4 category cards", async ({ page }) => {
    const cards = page.locator(CARD_SELECTOR);
    await expect(cards).toHaveCount(4);
    for (const { label } of EXPECTED_CARDS) {
      await expect(page.locator(`${CARD_SELECTOR}[aria-label="${label}"]`)).toBeVisible();
    }
  });

  test("each card links to the correct /shop/<slug>", async ({ page }) => {
    for (const { label, href } of EXPECTED_CARDS) {
      const card = page.locator(`${CARD_SELECTOR}[aria-label="${label}"]`);
      await expect(card).toHaveAttribute("href", href);
    }
  });

  test("section heading is accessible", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /four ways to sleep/i }),
    ).toBeVisible();
  });
});

// Viewport tests: verify no card overflows its container at 3 breakpoints.
// Overflow is detected by comparing scrollWidth to clientWidth — any clipped
// card content would cause scrollWidth > clientWidth.
const VIEWPORTS = [
  { name: "mobile-375",  width: 375,  height: 812 },
  { name: "tablet-768", width: 768,  height: 1024 },
  { name: "desktop-1280", width: 1280, height: 900 },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`Viewport ${vp.name} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`all 4 cards visible without overflow at ${vp.width}px`, async ({ page }) => {
      await page.goto("/", { timeout: PAGE_TIMEOUT });

      const cards = page.locator(CARD_SELECTOR);
      await expect(cards).toHaveCount(4);

      // Verify each card is attached and visible
      for (const { label } of EXPECTED_CARDS) {
        await expect(
          page.locator(`${CARD_SELECTOR}[aria-label="${label}"]`),
        ).toBeVisible();
      }

      // Check no card overflows its bounding box
      const overflowing = await page.evaluate((selector) => {
        const cards = Array.from(document.querySelectorAll(selector));
        return cards
          .map((el) => ({
            label: el.getAttribute("aria-label") ?? "unknown",
            overflows: el.scrollWidth > el.clientWidth + 2, // 2px tolerance for subpixel
          }))
          .filter((c) => c.overflows)
          .map((c) => c.label);
      }, CARD_SELECTOR);

      expect(overflowing, `Cards overflowing at ${vp.width}px`).toHaveLength(0);
    });
  });
}
