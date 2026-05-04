/**
 * /about page E2E smoke spec — cf-3qt.8.28
 *
 * Verifies the v3 illustration migration on /about (PR #401):
 * BotanicalMountainSkyline → MascotWorldHero (v3-01-porch),
 * BotanicalTimeline → MascotTimeline, TeamPortrait removed.
 *
 * No fixture mode required — /about is a static server component.
 *
 * Acceptance criteria:
 *   1. /about returns HTTP 200
 *   2. v3 porch scene (data-slot="mascot-world-hero") renders
 *   3. No "botanical" class names or text in the page DOM
 *   4. Character timeline section (data-slot="mascot-timeline") visible
 *   5. No console errors
 */

import { test, expect, type ConsoleMessage } from "@playwright/test";

const PAGE_TIMEOUT = 20_000;

test.describe("/about page — v3 illustrations", () => {
  test.setTimeout(35_000);

  // ── 1. HTTP 200 ─────────────────────────────────────────────────────────────

  test("GET /about returns HTTP 200", async ({ page }) => {
    const res = await page.goto("/about", { timeout: PAGE_TIMEOUT });
    expect(res?.status()).toBe(200);
  });

  // ── 2. v3 porch scene renders ────────────────────────────────────────────────

  test("v3 MascotWorldHero porch scene is in the DOM", async ({ page }) => {
    await page.goto("/about", { timeout: PAGE_TIMEOUT });
    // Outer wrapper placed by page.tsx
    await expect(
      page.locator('[data-slot="about-illustration"]'),
    ).toBeVisible({ timeout: PAGE_TIMEOUT });
    // Inner SVG placed by MascotWorldHero
    await expect(
      page.locator('[data-slot="mascot-world-hero"]'),
    ).toBeAttached({ timeout: PAGE_TIMEOUT });
  });

  // ── 3. No botanical class names in DOM ──────────────────────────────────────

  test("no botanical component class names remain in the page DOM", async ({
    page,
  }) => {
    await page.goto("/about", { timeout: PAGE_TIMEOUT });
    await expect(page.locator('[data-slot="about-illustration"]')).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });

    // Look for any element whose class attribute contains "botanical" (case-insensitive)
    const botanicalElements = page.locator('[class*="botanical" i]');
    await expect(botanicalElements).toHaveCount(0);

    // Also check page text — botanical headings or alt text would be a regression
    const bodyText = await page.locator("body").innerText();
    expect(
      bodyText.toLowerCase(),
      "page body should not mention 'botanical'",
    ).not.toContain("botanical");
  });

  // ── 4. Character timeline visible ───────────────────────────────────────────

  test("mascot timeline section is in the DOM", async ({ page }) => {
    await page.goto("/about", { timeout: PAGE_TIMEOUT });
    await expect(
      page.locator('[data-slot="mascot-timeline"]'),
    ).toBeAttached({ timeout: PAGE_TIMEOUT });
  });

  test("character ensemble section is visible in the team section", async ({
    page,
  }) => {
    await page.goto("/about", { timeout: PAGE_TIMEOUT });
    await expect(
      page.locator('[data-slot="character-ensemble"]'),
    ).toBeVisible({ timeout: PAGE_TIMEOUT });
  });

  // ── 5. No console errors ─────────────────────────────────────────────────────

  test("page loads with no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg: ConsoleMessage) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err: Error) => errors.push(err.message));

    await page.goto("/about", { timeout: PAGE_TIMEOUT });
    await expect(
      page.locator('[data-slot="about-illustration"]'),
    ).toBeVisible({ timeout: PAGE_TIMEOUT });

    expect(errors, `Console errors: ${errors.join("; ")}`).toHaveLength(0);
  });

  // ── Bonus: page content ──────────────────────────────────────────────────────

  test("h1 names the page and founding year 1991 is present", async ({
    page,
  }) => {
    await page.goto("/about", { timeout: PAGE_TIMEOUT });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
    await expect(page.getByText(/1991/)).toBeVisible({ timeout: PAGE_TIMEOUT });
  });
});
