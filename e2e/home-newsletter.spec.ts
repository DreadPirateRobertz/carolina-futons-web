/**
 * HomeNewsletterSection E2E smoke spec — cf-l6aj.9
 *
 * Verifies the inline newsletter section is present on the home page
 * and the form is usable. Does NOT submit (avoids Wix API side-effects in CI).
 *
 * No fixture mode required — the newsletter section is a static client
 * component that doesn't depend on Wix product data.
 */

import { test, expect } from "@playwright/test";

const PAGE_TIMEOUT = 20_000;

test.describe("HomeNewsletterSection — home page", () => {
  test.setTimeout(30_000);

  test("newsletter section is visible with heading, input, and submit button", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT });

    const section = page.locator('[data-slot="home-newsletter-section"]');
    await expect(section).toBeVisible({ timeout: PAGE_TIMEOUT });

    await expect(
      section.getByRole("heading", { name: /stay in the loop/i }),
    ).toBeVisible();

    await expect(section.getByRole("textbox")).toBeVisible();
    await expect(
      section.getByRole("button", { name: /subscribe/i }),
    ).toBeVisible();
  });
});
