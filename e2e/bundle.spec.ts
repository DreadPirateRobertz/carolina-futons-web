import { test, expect } from "@playwright/test";

test.describe("bundle builder — /bundle", () => {
  test("renders page heading and two product selection sections", async ({
    page,
  }) => {
    await page.goto("/bundle", { waitUntil: "domcontentloaded" });

    const main = page.locator('[data-slot="bundle-page"]');
    await expect(main).toBeVisible();

    await expect(
      main.getByRole("heading", { name: /build your bundle/i }),
    ).toBeVisible();

    await expect(
      main.getByRole("heading", { name: /choose a futon frame/i }),
    ).toBeVisible();

    await expect(
      main.getByRole("heading", { name: /choose a mattress/i }),
    ).toBeVisible();
  });

  test("price summary appears after selecting a frame and a mattress", async ({
    page,
  }) => {
    await page.goto("/bundle", { waitUntil: "domcontentloaded" });

    const configurator = page.locator('[data-slot="bundle-configurator"]');

    // Select first frame option
    const firstFrame = configurator.locator("section").first().getByRole("button").first();
    await firstFrame.click();

    // Select first mattress option
    const firstMattress = configurator.locator("section").nth(1).getByRole("button").first();
    await firstMattress.click();

    // Price summary should appear
    await expect(
      configurator.locator('[data-slot="bundle-price-summary"]'),
    ).toBeVisible();

    // Add to cart button should be enabled
    await expect(
      configurator.getByRole("button", { name: /add bundle to cart/i }),
    ).toBeEnabled();
  });
});
