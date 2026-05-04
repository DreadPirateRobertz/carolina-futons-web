/**
 * MascotCategoryCard — reduced-motion E2E (cf-pmdf / cf-q5km.1)
 *
 * Verifies that the useReducedMotion guard added in PR #423 works end-to-end:
 *   • WITHOUT prefers-reduced-motion: hovering a card lifts it (box-shadow changes)
 *   • WITH    prefers-reduced-motion: hovering a card produces NO animation
 *
 * The /shop page renders MascotCategoryCard for every SHOP_CATEGORIES entry.
 * Cards use data-slot="category-card" as a stable selector.
 *
 * Run locally:
 *   npx playwright test e2e/mascot-category-card-a11y.spec.ts
 */

import { test, expect } from "@playwright/test";

const SHOP = "/shop";
const CARD = '[data-slot="category-card"]';

// Framer-motion writes boxShadow as an inline style when it animates variants.
// Rest  → "0 4px 12px rgba(58,37,24,.08)"
// Hover → "0 16px 40px rgba(58,37,24,.22)"
async function getCardBoxShadow(page: import("@playwright/test").Page): Promise<string> {
  return page.locator(CARD).first().evaluate((el) => (el as HTMLElement).style.boxShadow);
}

test.describe("MascotCategoryCard — reduced-motion guard", () => {
  test.setTimeout(20_000);

  test("WITHOUT reduced-motion: hover lifts card (box-shadow changes)", async ({ page }) => {
    await page.goto(SHOP, { waitUntil: "networkidle" });

    const card = page.locator(CARD).first();
    await expect(card).toBeVisible();

    const shadowBefore = await getCardBoxShadow(page);

    await card.hover();
    // Allow spring animation to settle (stiffness 300 / damping 22 ≈ 300 ms)
    await page.waitForTimeout(400);

    const shadowAfter = await getCardBoxShadow(page);

    expect(shadowAfter).not.toBe(shadowBefore);
    // Confirm the hover variant's larger shadow is present
    expect(shadowAfter).toContain("rgba(58,37,24,.22)");
  });

  test("WITH reduced-motion: hover does NOT animate card (box-shadow unchanged)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(SHOP, { waitUntil: "networkidle" });

    const card = page.locator(CARD).first();
    await expect(card).toBeVisible();

    const shadowBefore = await getCardBoxShadow(page);

    await card.hover();
    await page.waitForTimeout(400);

    const shadowAfter = await getCardBoxShadow(page);

    // Box-shadow must be identical — framer-motion animate=undefined means no change
    expect(shadowAfter).toBe(shadowBefore);
    // Confirm the hover variant's shadow is absent
    expect(shadowAfter).not.toContain("rgba(58,37,24,.22)");
  });

  test("WITH reduced-motion: keyboard focus does NOT animate card", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(SHOP, { waitUntil: "networkidle" });

    const card = page.locator(CARD).first();
    await expect(card).toBeVisible();

    const shadowBefore = await getCardBoxShadow(page);

    await card.focus();
    await page.waitForTimeout(400);

    const shadowAfter = await getCardBoxShadow(page);

    expect(shadowAfter).toBe(shadowBefore);
  });

  test("cards have accessible link text (aria-label)", async ({ page }) => {
    await page.goto(SHOP, { waitUntil: "networkidle" });

    const cards = page.locator(CARD);
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const label = await cards.nth(i).getAttribute("aria-label");
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(0);
    }
  });
});
