/**
 * /design-a-room page smoke tests — cfw-dxb
 *
 * Verifies the design consultation page renders its key content: h1, at least
 * one interactive control (room planner inputs), a link to the product catalog,
 * no console errors, and no 404/redirect.
 *
 * RoomPlannerCanvas and RoomSceneViewer are client components — tests that
 * need them wait for hydration via the "Room width" spinbutton.
 *
 * Run with:
 *   npx playwright test e2e/design-a-room.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

const PAGE_TIMEOUT = 15_000;

async function gotoDesignARoom(page: Page) {
  await page.goto("/design-a-room");
  await page.getByRole("heading", { level: 1 }).waitFor({
    state: "visible",
    timeout: PAGE_TIMEOUT,
  });
}

test.describe("/design-a-room — page smoke", () => {
  test.setTimeout(30_000);

  test("page loads without 404 or redirect", async ({ page }) => {
    const response = await page.goto("/design-a-room");
    expect(response?.status()).toBe(200);
    expect(page.url()).toContain("/design-a-room");
  });

  test("h1 is visible on page load", async ({ page }) => {
    await gotoDesignARoom(page);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toContainText(/design a room/i);
  });

  test("room planner dimension inputs are present and interactive", async ({
    page,
  }) => {
    await gotoDesignARoom(page);
    // RoomPlannerCanvas renders labeled number inputs after React hydration
    const widthInput = page.getByRole("spinbutton", { name: /room width/i });
    await expect(widthInput).toBeVisible({ timeout: PAGE_TIMEOUT });
    const depthInput = page.getByRole("spinbutton", { name: /room depth/i });
    await expect(depthInput).toBeVisible({ timeout: PAGE_TIMEOUT });
  });

  test("shop catalog link is present", async ({ page }) => {
    await gotoDesignARoom(page);
    // "Want to browse first?" section — "full catalog" → /shop
    const shopLink = page.getByRole("link", { name: /full catalog/i });
    await expect(shopLink).toBeVisible();
    await expect(shopLink).toHaveAttribute("href", "/shop");
  });

  test("page loads with no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/design-a-room");
    await page.getByRole("heading", { level: 1 }).waitFor({
      state: "visible",
      timeout: PAGE_TIMEOUT,
    });

    expect(consoleErrors).toHaveLength(0);
  });
});
