/**
 * VideoShowcaseStrip E2E smoke spec — cf-205c / cf-l6aj.6.1
 *
 * Verifies the VideoShowcaseStrip section is live on the home page (PR #424).
 * No fixture mode required — the showcase catalog is static (getVideoCatalog()),
 * independent of Wix product data.
 *
 * Acceptance criteria:
 *   1. GET / returns HTTP 200
 *   2. [data-slot="video-showcase-strip"] section is visible
 *   3. "See it in action" heading present
 *   4. Exactly 3 video thumbnail buttons rendered
 *   5. "Watch all" CTA links to /videos
 *   6. No console errors
 */

import { test, expect, type ConsoleMessage } from "@playwright/test";

const PAGE_TIMEOUT = 20_000;

test.describe("VideoShowcaseStrip — home page", () => {
  test.setTimeout(35_000);

  // ── 1. HTTP 200 ─────────────────────────────────────────────────────────────

  test("GET / returns HTTP 200", async ({ page }) => {
    const res = await page.goto("/", { timeout: PAGE_TIMEOUT });
    expect(res?.status()).toBe(200);
  });

  // ── 2. Section visible ───────────────────────────────────────────────────────

  test("video-showcase-strip section is visible on the home page", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT });
    await expect(
      page.locator('[data-slot="video-showcase-strip"]'),
    ).toBeVisible({ timeout: PAGE_TIMEOUT });
  });

  // ── 3. Heading ───────────────────────────────────────────────────────────────

  test('"See it in action" heading is visible', async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT });
    await expect(
      page.locator('[data-slot="video-showcase-strip"]').getByRole("heading", {
        name: /see it in action/i,
      }),
    ).toBeVisible({ timeout: PAGE_TIMEOUT });
  });

  // ── 4. Exactly 3 thumbnails ──────────────────────────────────────────────────

  test("exactly 3 video thumbnail buttons render", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT });
    const strip = page.locator('[data-slot="video-showcase-strip"]');
    await expect(strip).toBeVisible({ timeout: PAGE_TIMEOUT });
    const buttons = strip.getByRole("button", { name: /^Play video:/i });
    await expect(buttons).toHaveCount(3, { timeout: PAGE_TIMEOUT });
  });

  // ── 5. Watch all CTA ─────────────────────────────────────────────────────────

  test('"Watch all" CTA links to /videos', async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT });
    const cta = page
      .locator('[data-slot="video-showcase-strip"]')
      .getByRole("link", { name: /watch all/i });
    await expect(cta).toBeVisible({ timeout: PAGE_TIMEOUT });
    await expect(cta).toHaveAttribute("href", "/videos");
  });

  // ── 6. No console errors ─────────────────────────────────────────────────────

  test("home page logs no console errors during VideoShowcaseStrip render", async ({
    page,
  }) => {
    const errors: ConsoleMessage[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg);
    });
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT });
    await expect(
      page.locator('[data-slot="video-showcase-strip"]'),
    ).toBeVisible({ timeout: PAGE_TIMEOUT });
    expect(errors).toHaveLength(0);
  });
});
