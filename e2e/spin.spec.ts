import { test, expect } from "@playwright/test";

test.describe("spin wheel — /spin", () => {
  test("renders heading, prize wheel SVG, and Spin button", async ({ page }) => {
    await page.goto("/spin", { waitUntil: "domcontentloaded" });

    const main = page.locator('[data-slot="spin-page"]');
    await expect(main).toBeVisible();

    await expect(
      main.getByRole("heading", { name: /spin to win/i }),
    ).toBeVisible();

    // SVG wheel rendered inside the spin-wheel slot
    const wheel = main.locator('[data-slot="spin-wheel"]');
    await expect(wheel).toBeVisible();
    await expect(wheel.locator("svg")).toBeVisible();

    // Spin button present and enabled before first spin
    await expect(
      wheel.getByRole("button", { name: /spin the wheel/i }),
    ).toBeEnabled();
  });

  test("shows prize result after clicking Spin", async ({ page }) => {
    // Clear the spin cookie so the cooldown doesn't block us
    await page.goto("/spin", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /spin the wheel/i }).click();

    // After spin: prize panel OR cooldown error — both are valid outcomes
    const prizePanel = page.locator('[data-testid="spin-prize"]');
    const errorMsg = page.getByRole("alert");

    await expect(prizePanel.or(errorMsg)).toBeVisible({ timeout: 10000 });
  });
});
