/**
 * /sustainability page smoke tests — cfw-06n
 *
 * Static marketing page with static fallback content (no fixture gate needed).
 * Tests confirm key sections render, images have valid src attributes, and no
 * console errors fire on load.
 *
 * Run with:
 *   npx playwright test e2e/sustainability-page.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

const PAGE_TIMEOUT = 15_000;

async function gotoSustainability(page: Page) {
  await page.goto("/sustainability");
  await page.getByRole("heading", { level: 1 }).waitFor({
    state: "visible",
    timeout: PAGE_TIMEOUT,
  });
}

test.describe("/sustainability — page smoke", () => {
  test.setTimeout(30_000);

  test("h1 is visible on page load", async ({ page }) => {
    await gotoSustainability(page);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    // Hardcoded HERO.heading — not CMS-driven
    await expect(h1).toContainText(/furniture that cares for the planet/i);
  });

  test("at least one section heading is visible", async ({ page }) => {
    await gotoSustainability(page);
    // Any of the static section h2s: "How we build it", "What we use",
    // "Carbon offset program", "Certifications & standards", "Trade-in program"
    const sectionHeading = page
      .getByRole("heading", { level: 2 })
      .first();
    await expect(sectionHeading).toBeVisible();
    await expect(sectionHeading).not.toBeEmpty();
  });

  test("all img elements have non-empty src attributes", async ({ page }) => {
    await gotoSustainability(page);
    // In fallback mode materials render as <div role="img"> placeholders,
    // not <img> tags — so count may be 0. If Wix provides imageUrls the
    // real <img> tags must have non-empty src.
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const src = await images.nth(i).getAttribute("src");
      expect(src, `img[${i}] must have non-empty src`).toBeTruthy();
    }
  });

  test("page loads with no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/sustainability");
    await page.getByRole("heading", { level: 1 }).waitFor({
      state: "visible",
      timeout: PAGE_TIMEOUT,
    });

    expect(consoleErrors).toHaveLength(0);
  });

  test("trade-in CTA link is present", async ({ page }) => {
    await gotoSustainability(page);
    // Primary CTA on the page — links to /contact to start a trade-in request
    const ctaLink = page.getByRole("link", { name: /ask about trade.in/i });
    await expect(ctaLink).toBeVisible();
    await expect(ctaLink).toHaveAttribute("href", "/contact");
  });
});
