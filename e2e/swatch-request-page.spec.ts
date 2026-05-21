/**
 * /swatch-request page smoke tests — cfw-1xt
 *
 * Verifies the swatch-request page renders its heading, the fabric swatch
 * selection fieldset, contact form fields, and that server-side validation
 * fires on empty submit. No real swatch order is placed — schema validation
 * runs before Turnstile and email dispatch so an empty submit returns field
 * errors immediately.
 *
 * NOTE: CI may be red until PR #930 (swatch SiteContent wiring) merges.
 * The spec uses fallback copy that matches the hardcoded defaults, so it
 * remains correct both before and after that merge.
 *
 * Run with:
 *   npx playwright test e2e/swatch-request-page.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

const PAGE_TIMEOUT = 15_000;

async function gotoSwatchRequest(page: Page) {
  await page.goto("/swatch-request");
  // Wait for React hydration — SwatchRequestForm is a client component.
  // The submit button is the last interactive element to mount.
  await expect(
    page.getByRole("button", { name: /request swatches/i }),
    "Submit button not visible — SwatchRequestForm may not have hydrated",
  ).toBeVisible({ timeout: PAGE_TIMEOUT });
}

test.describe("/swatch-request — page smoke", () => {
  test.setTimeout(30_000);

  test("page loads without 404 or redirect", async ({ page }) => {
    const response = await page.goto("/swatch-request");
    expect(response?.status()).toBe(200);
    expect(page.url()).toContain("/swatch-request");
  });

  test("h1 'Request fabric swatches.' is visible", async ({ page }) => {
    await gotoSwatchRequest(page);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toContainText(/request fabric swatches/i);
  });

  test("swatch selection fieldset is present", async ({ page }) => {
    await gotoSwatchRequest(page);
    // Fieldset always renders — either with swatch checkboxes or an
    // "No swatches available" fallback when the CMS returns nothing.
    const fieldset = page.getByRole("group", {
      name: /choose up to \d+ swatches/i,
    });
    await expect(fieldset).toBeVisible();
  });

  test("contact form fields are present", async ({ page }) => {
    await gotoSwatchRequest(page);
    await expect(
      page.getByRole("textbox", { name: /first name/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /last name/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /email/i }),
    ).toBeVisible();
  });

  test("submitting empty form surfaces server-side validation errors", async ({
    page,
  }) => {
    await gotoSwatchRequest(page);
    await page.getByRole("button", { name: /request swatches/i }).click();
    // Schema validation runs before Turnstile — empty required fields return
    // contact errors immediately via useActionState → role="alert" paragraphs.
    const firstAlert = page.getByRole("alert").first();
    await expect(firstAlert).toBeVisible({ timeout: PAGE_TIMEOUT });
  });
});
