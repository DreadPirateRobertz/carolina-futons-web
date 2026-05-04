// Gift Registry E2E spec (cf-l6aj.16).
//
// Tests: create form, registry list, shareable link, responsive widths.
// Uses localStorage directly — no Wix CMS or fixture products required.
//
// Run: npx playwright test e2e/gift-registry.spec.ts

import { test, expect } from "@playwright/test";

const STORAGE_KEY = "cf:registry:v1";
const REGISTRY_URL = "/gift-registry";

test.setTimeout(30_000);

test.describe("Gift Registry (/gift-registry)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(REGISTRY_URL);
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload();
  });

  test("empty state — shows create trigger, no registry items", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /new registry/i }),
    ).toBeVisible();
    await expect(page.locator('[data-slot="registry-list-empty"]')).toBeVisible();
  });

  test("create form — submit creates a registry and displays it in the list", async ({ page }) => {
    await page.getByRole("button", { name: /new registry/i }).click();
    await expect(
      page.getByRole("form", { name: /create a gift registry/i }),
    ).toBeVisible();

    await page.getByLabel("Registry name").fill("Sarah & Tom's Wedding");
    await page.getByLabel("Occasion").selectOption("wedding");

    await page.getByRole("button", { name: /create registry/i }).click();

    await expect(page.locator('[data-slot="registry-list"]')).toBeVisible();
    await expect(page.getByText("Sarah & Tom's Wedding")).toBeVisible();
    await expect(page.locator('[data-slot="registry-list-empty"]')).toHaveCount(0);
  });

  test("share button copies link to clipboard on same device", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.getByRole("button", { name: /new registry/i }).click();
    await page.getByLabel("Registry name").fill("Clipboard Test Registry");
    await page.getByRole("button", { name: /create registry/i }).click();

    const shareBtn = page.locator('[data-slot="registry-share-button"]').first();
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    await expect(shareBtn).toContainText("Copied!");

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toMatch(/\/gift-registry\/[a-z0-9-]+/i);
  });

  test("public view renders registry on same device", async ({ page }) => {
    await page.getByRole("button", { name: /new registry/i }).click();
    await page.getByLabel("Registry name").fill("My Housewarming");
    await page.getByLabel("Occasion").selectOption("housewarming");
    await page.getByRole("button", { name: /create registry/i }).click();

    const registryLink = page.locator('[data-slot="registry-list"] a').first();
    const href = await registryLink.getAttribute("href");
    expect(href).toMatch(/^\/gift-registry\/.+/);

    await page.goto(href!);
    await expect(page.locator('[data-slot="registry-public-view"]')).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "My Housewarming" }),
    ).toBeVisible();
    await expect(
      page.locator('[data-slot="registry-items-empty"]'),
    ).toBeVisible();
  });

  for (const width of [375, 768, 1280]) {
    test(`renders correctly at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await expect(page.getByRole("heading", { name: /gift registries/i })).toBeVisible();
      await expect(
        page.getByRole("button", { name: /new registry/i }),
      ).toBeVisible();
    });
  }
});
