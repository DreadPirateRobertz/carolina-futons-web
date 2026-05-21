/**
 * cfw-1gi: Survey page e2e smoke tests.
 *
 * Verifies /survey renders its core NPS form elements and produces no
 * console errors. Complements e2e/survey.spec.ts (which spot-checks NPS
 * values 0/5/10 and orderId pre-fill); this file checks all 11 NPS inputs.
 *
 * NPS radio inputs are rendered sr-only (visually hidden but accessible).
 * Playwright treats clip-rect elements as visible unless display:none or
 * visibility:hidden — so toBeVisible() passes for each radio.
 *
 * Run against Vercel preview:
 *   BASE_URL=https://carolina-futons-web.vercel.app npx playwright test e2e/survey-page.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

const SURVEY_SCOPE = '[data-slot="survey-page"]';

async function gotoSurvey(page: Page) {
  await page.goto("/survey", { waitUntil: "domcontentloaded" });
  await expect(page.locator(SURVEY_SCOPE)).toBeVisible();
}

test.describe("/survey — smoke (cfw-1gi)", () => {
  test("primary heading is visible", async ({ page }) => {
    await gotoSurvey(page);
    await expect(
      page.locator(SURVEY_SCOPE).getByRole("heading", { level: 1, name: /how did we do/i }),
    ).toBeVisible();
  });

  test("NPS scale renders radio inputs for every score 0–10", async ({ page }) => {
    await gotoSurvey(page);
    const form = page.locator(SURVEY_SCOPE);
    for (let score = 0; score <= 10; score++) {
      await expect(form.getByRole("radio", { name: String(score) })).toBeVisible();
    }
  });

  test("comments textarea is visible", async ({ page }) => {
    await gotoSurvey(page);
    await expect(
      page.locator(SURVEY_SCOPE).getByRole("textbox", { name: /main reason/i }),
    ).toBeVisible();
  });

  test("submit button is visible and enabled", async ({ page }) => {
    await gotoSurvey(page);
    const submit = page.locator(SURVEY_SCOPE).getByRole("button", { name: /submit/i });
    await expect(submit).toBeVisible();
    await expect(submit).toBeEnabled();
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/survey", { waitUntil: "domcontentloaded" });
    expect(errors).toHaveLength(0);
  });
});
