/**
 * Brenda admin guide — screenshot capture scaffold
 *
 * Companion to docs/brenda-admin-guide.md (carolina-futons monorepo,
 * cf-ubxu / PR #1155). This spec navigates the seven Wix Studio
 * dashboard flows the guide covers and snapshots each step.
 *
 * Why a Playwright spec instead of an automated capture in CI:
 * - The Wix dashboard requires an authenticated owner session — Playwright
 *   can't log in for us without credentials we shouldn't store.
 * - Screenshots will contain real customer PII (orders, inbox threads,
 *   inquiries) that does NOT belong in a public repo. Treat the captures
 *   as locally-scrubbed artefacts to be moved into the carolina-futons
 *   monorepo's docs/brenda-admin-guide/ directory after manual review.
 *
 * How to run (Stilgar):
 *
 *   1. Sign in to https://www.wix.com/my-account once with the CF owner
 *      account, then save storage state:
 *      `npx playwright codegen --save-storage=e2e/.wix-auth.json https://www.wix.com/my-account/login`
 *   2. Set BRENDA_GUIDE_DASHBOARD_URL — e.g.
 *      `BRENDA_GUIDE_DASHBOARD_URL=https://www.wix.com/dashboard/3af610bf-...`
 *   3. Run headed so you can review each capture before it lands:
 *      `BRENDA_GUIDE_AUTH=e2e/.wix-auth.json pnpm exec playwright test e2e/brenda-admin-screenshots.spec.ts --headed --project=chromium`
 *   4. Captures land in `e2e/brenda-admin-guide-out/` (gitignored). Manually
 *      review for PII, scrub, then move the keepers into the cfutons
 *      monorepo's `docs/brenda-admin-guide/` per the naming checklist at
 *      the bottom of brenda-admin-guide.md.
 *
 * Skip if env vars are missing — keeps CI green for everyone else.
 */

import { test, expect } from "@playwright/test";
import path from "node:path";

const DASHBOARD_URL = process.env.BRENDA_GUIDE_DASHBOARD_URL;
const AUTH_STATE = process.env.BRENDA_GUIDE_AUTH;

const OUT_DIR = path.resolve("e2e/brenda-admin-guide-out");

test.describe("Brenda admin guide screenshot capture", () => {
  test.skip(
    !DASHBOARD_URL || !AUTH_STATE,
    "BRENDA_GUIDE_DASHBOARD_URL and BRENDA_GUIDE_AUTH must be set; see file header.",
  );

  test.use({ storageState: AUTH_STATE });
  test.setTimeout(120_000);

  test("01 — login landing", async ({ page }) => {
    await page.goto("https://www.wix.com/my-account/login");
    await expect(page).toHaveURL(/wix\.com/);
    await page.screenshot({
      path: path.join(OUT_DIR, "01-login.png"),
      fullPage: false,
    });
  });

  test("02-03 — Wix Stores → Catalog → Products list + product edit", async ({
    page,
  }) => {
    await page.goto(`${DASHBOARD_URL}/store/products`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(OUT_DIR, "02-products-nav.png"),
    });

    // Click into the first product row to capture an edit page. This will
    // grab whichever product is alphabetically first — Stilgar should
    // re-shoot 03 on a Brenda-friendly product (e.g. Kingston) by hand.
    const firstRow = page.locator('[data-hook="product-row"], a[href*="/store/products/"]').first();
    await firstRow.click();
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(OUT_DIR, "03-product-edit.png"),
      fullPage: true,
    });
  });

  test("04 — product visibility toggle", async ({ page }) => {
    // Same product detail page as 03 — focus on the visibility toggle.
    await page.goto(`${DASHBOARD_URL}/store/products`);
    await page.locator('[data-hook="product-row"], a[href*="/store/products/"]').first().click();
    await page.waitForLoadState("networkidle");
    const toggle = page.getByRole("switch").first();
    await expect(toggle).toBeVisible();
    await toggle.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(OUT_DIR, "04-product-visibility.png"),
    });
  });

  test("05-06 — CMS Guides collection + article edit", async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}/database/collections`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(OUT_DIR, "05-cms-guides.png"),
    });

    // Open the Guides collection. Falls back to a partial-text match if the
    // exact role/name pair shifts under us.
    await page
      .getByRole("link", { name: /^Guides/i })
      .or(page.getByText(/^Guides\s/))
      .first()
      .click();
    await page.waitForLoadState("networkidle");
    await page.locator('[data-hook="row"]').first().click();
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(OUT_DIR, "06-guide-article-edit.png"),
      fullPage: true,
    });
  });

  test("07-08 — CMS CommunityPhotos collection + add-item", async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}/database/collections`);
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("link", { name: /CommunityPhotos/i })
      .or(page.getByText(/CommunityPhotos/))
      .first()
      .click();
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(OUT_DIR, "07-cms-community-photos.png"),
    });

    await page.getByRole("button", { name: /add item/i }).click();
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(OUT_DIR, "08-community-photo-edit.png"),
      fullPage: true,
    });
  });

  test("09 — Inbox", async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}/inbox`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(OUT_DIR, "09-inbox.png"),
    });
  });

  test("10-11 — Wix Stores Orders list + order detail", async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}/store/orders`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(OUT_DIR, "10-orders-list.png"),
    });

    const firstOrder = page.locator('[data-hook="order-row"], a[href*="/store/orders/"]').first();
    await firstOrder.click();
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(OUT_DIR, "11-order-detail.png"),
      fullPage: true,
    });
  });
});
