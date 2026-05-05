import { test, expect } from "@playwright/test";

test.describe("survey page — /survey", () => {
  test("renders heading, NPS scale, comments textarea, and Submit button", async ({
    page,
  }) => {
    await page.goto("/survey", { waitUntil: "domcontentloaded" });

    const main = page.locator('[data-slot="survey-page"]');
    await expect(main).toBeVisible();

    await expect(
      main.getByRole("heading", { name: /how did we do/i }),
    ).toBeVisible();

    // NPS radio buttons 0–10
    for (const label of ["0", "5", "10"]) {
      await expect(main.getByRole("radio", { name: label })).toBeVisible();
    }

    // Comments textarea
    await expect(
      main.getByRole("textbox", { name: /main reason/i }),
    ).toBeVisible();

    // Submit button
    await expect(main.getByRole("button", { name: /submit/i })).toBeVisible();
  });

  test("pre-fills orderId in page copy when ?orderId= is present", async ({
    page,
  }) => {
    await page.goto("/survey?orderId=TEST-999", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/TEST-999/)).toBeVisible();
  });
});
