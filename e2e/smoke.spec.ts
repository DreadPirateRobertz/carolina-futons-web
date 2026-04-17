import { test, expect } from "@playwright/test";

test("/smoke page loads and shows check results", async ({ page }) => {
  await page.goto("/smoke");
  await expect(page.locator("h1")).toContainText("/smoke");
  // Should show status line (PASS or FAIL — we just verify the page renders)
  await expect(page.locator("main")).toContainText("Status:");
});
