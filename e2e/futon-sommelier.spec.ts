import { test, expect } from "@playwright/test";

test.describe("futon sommelier — /futon-sommelier", () => {
  test("renders first question with progress bar and option buttons", async ({
    page,
  }) => {
    await page.goto("/futon-sommelier", { waitUntil: "domcontentloaded" });

    const quiz = page.locator('[data-slot="futon-sommelier-quiz"]');
    await expect(quiz).toBeVisible();

    // First question heading
    await expect(
      quiz.getByRole("heading", { name: /how often/i }),
    ).toBeVisible();

    // Progress bar
    await expect(quiz.getByRole("progressbar")).toBeVisible();

    // At least two answer options
    const buttons = quiz.getByRole("button");
    await expect(buttons.first()).toBeVisible();
  });

  test("advances to next question on option click", async ({ page }) => {
    await page.goto("/futon-sommelier", { waitUntil: "domcontentloaded" });

    const quiz = page.locator('[data-slot="futon-sommelier-quiz"]');
    // Answer Q1 — click "Occasionally"
    await quiz.getByRole("button", { name: /occasionally/i }).click();

    // Q2 should now be visible (firmness question)
    await expect(
      quiz.getByRole("heading", { name: /firmness/i }),
    ).toBeVisible();
  });

  test("reaches results after answering all questions", async ({ page }) => {
    await page.goto("/futon-sommelier", { waitUntil: "domcontentloaded" });

    // Q1 — sleep frequency
    await page.getByRole("button", { name: /occasionally/i }).click();
    // Q2 — firmness
    await page.getByRole("button", { name: /medium/i }).click();
    // Q3 — frame style
    await page.getByRole("button", { name: /natural wood/i }).click();
    // Q4 — size
    await page.getByRole("button", { name: /full/i }).click();

    const results = page.locator('[data-slot="futon-sommelier-results"]');
    await expect(results).toBeVisible();
    await expect(
      results.getByRole("heading"),
    ).toBeVisible();
    // Shop CTA link should point to /shop/...
    const shopLink = results.getByRole("link", { name: /shop/i });
    await expect(shopLink).toHaveAttribute("href", /^\/shop\//);
  });
});
