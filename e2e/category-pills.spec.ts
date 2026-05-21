/**
 * CategoryPills ?sub= filter smoke tests — cfw-36d
 *
 * Covers the sub-category pill nav rendered on /shop/futon-frames.
 * Fixture mode (NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1) so the product set
 * is deterministic; pill state is independent of live Wix catalog data.
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/category-pills.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

const PLP_TIMEOUT = 15_000;

async function waitForPlpControls(page: Page) {
  await expect(
    page.locator("select#plp-sort"),
    "PLP sort control (#plp-sort) not visible — PLPControls may not have hydrated; CategoryPills will not be mounted",
  ).toBeVisible({ timeout: PLP_TIMEOUT });
}

test.describe("/shop/futon-frames — CategoryPills sub-filter", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(30_000);

  test("renders sub-category nav with All pill active by default", async ({
    page,
  }) => {
    await page.goto("/shop/futon-frames");
    await waitForPlpControls(page);

    const nav = page.getByRole("navigation", { name: /sub-category filter/i });
    await expect(nav).toBeVisible();

    const allPill = nav.getByRole("link", { name: "All" });
    await expect(allPill).toBeVisible();
    await expect(allPill).toHaveAttribute("aria-current", "page");
  });

  test("?sub=wall-huggers activates the Wall Huggers pill", async ({ page }) => {
    await page.goto("/shop/futon-frames?sub=wall-huggers");
    await waitForPlpControls(page);

    const nav = page.getByRole("navigation", { name: /sub-category filter/i });
    const wallHuggersPill = nav.getByRole("link", { name: "Wall Huggers" });
    await expect(wallHuggersPill).toHaveAttribute("aria-current", "page");

    const allPill = nav.getByRole("link", { name: "All" });
    await expect(allPill).not.toHaveAttribute("aria-current", "page");
  });

  test("?sub=wall-huggers renders page without crash", async ({ page }) => {
    await page.goto("/shop/futon-frames?sub=wall-huggers");
    await waitForPlpControls(page);

    // No fixture frames have "Wall Hugger" in the name so the grid is empty,
    // but the page must not throw — the product count header still renders.
    const header = page.locator("p", { hasText: /\d+ products?/ });
    await expect(header).toBeVisible();
  });

  test("unknown ?sub= falls back gracefully with All pill active", async ({
    page,
  }) => {
    await page.goto("/shop/futon-frames?sub=nonexistent");
    await waitForPlpControls(page);

    const nav = page.getByRole("navigation", { name: /sub-category filter/i });
    const allPill = nav.getByRole("link", { name: "All" });
    await expect(allPill).toHaveAttribute("aria-current", "page");

    // All 2 fixture frames should be visible (no sub-filter applied)
    await expect(page.locator('[data-slot="product-card"]')).toHaveCount(2);
  });

  test("clicking Wall Huggers pill navigates to ?sub=wall-huggers and marks it active", async ({
    page,
  }) => {
    await page.goto("/shop/futon-frames");
    await waitForPlpControls(page);

    const nav = page.getByRole("navigation", { name: /sub-category filter/i });
    const wallHuggersPill = nav.getByRole("link", { name: "Wall Huggers" });
    await wallHuggersPill.click();

    await page.waitForURL(/[?&]sub=wall-huggers/, { timeout: PLP_TIMEOUT });
    await waitForPlpControls(page);

    await expect(wallHuggersPill).toHaveAttribute("aria-current", "page");
    const allPill = nav.getByRole("link", { name: "All" });
    await expect(allPill).not.toHaveAttribute("aria-current", "page");
  });
});
