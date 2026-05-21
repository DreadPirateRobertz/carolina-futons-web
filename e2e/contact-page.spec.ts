/**
 * Contact page smoke tests — cfw-tfe
 *
 * Verifies /contact renders, the contact form is interactive, server-side
 * validation fires on empty submit, and the sizeOfInterest radio group is
 * present. Does not submit a real message or require live Wix/Turnstile.
 *
 * The contact page is a Server Component with getSiteContent fallbacks; these
 * tests use the hardcoded fallback copy ("We'd love to hear from you.") which
 * matches the in-code default when no CMS value is provisioned.
 *
 * Run with:
 *   npx playwright test e2e/contact-page.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

const PAGE_TIMEOUT = 15_000;

async function gotoContact(page: Page) {
  await page.goto("/contact");
  // Wait for the ContactForm client component to hydrate — the submit button
  // is the last interactive element to become available after React hydration.
  await page.getByRole("button", { name: /send message/i }).waitFor({
    state: "visible",
    timeout: PAGE_TIMEOUT,
  });
}

test.describe("/contact — page smoke", () => {
  test.setTimeout(30_000);

  test("h1 is visible on page load", async ({ page }) => {
    await page.goto("/contact");
    // Fallback heading from CONTACT_COPY_FALLBACKS.introHeading; CMS may
    // override but the h1 element must always be present.
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible({ timeout: PAGE_TIMEOUT });
    await expect(h1).not.toBeEmpty();
  });

  test("contact form renders name, email, and message fields", async ({
    page,
  }) => {
    await gotoContact(page);

    const form = page.getByRole("form", { name: /contact form/i });
    await expect(form).toBeVisible();

    await expect(form.getByRole("textbox", { name: /^name/i })).toBeVisible();
    await expect(form.getByRole("textbox", { name: /^email/i })).toBeVisible();
    await expect(form.getByRole("textbox", { name: /message/i })).toBeVisible();
    await expect(
      form.getByRole("button", { name: /send message/i }),
    ).toBeVisible();
  });

  test("submitting empty form surfaces server-side field errors", async ({
    page,
  }) => {
    await gotoContact(page);

    await page.getByRole("button", { name: /send message/i }).click();

    // The Server Action validates before Turnstile — empty name + email return
    // errors immediately. role="alert" paragraphs render for each failed field.
    const alerts = page.getByRole("alert");
    await expect(alerts.first()).toBeVisible({ timeout: PAGE_TIMEOUT });

    // Assert at least the name error (first required field in schema order).
    await expect(page.getByText(/please tell us your name/i)).toBeVisible();
  });

  test("sizeOfInterest radio fieldset is visible with options", async ({
    page,
  }) => {
    await gotoContact(page);

    // The fieldset legend is "Bed size of interest (optional)".
    const fieldset = page.getByRole("group", {
      name: /bed size of interest/i,
    });
    await expect(fieldset).toBeVisible();

    // At least one radio option (Twin / Full / Queen / King) must be present.
    const radios = fieldset.getByRole("radio");
    await expect(radios.first()).toBeVisible();
    expect(await radios.count()).toBeGreaterThanOrEqual(1);
  });

  test("page loads with no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/contact");
    await page.getByRole("heading", { level: 1 }).waitFor({
      state: "visible",
      timeout: PAGE_TIMEOUT,
    });

    expect(consoleErrors).toHaveLength(0);
  });
});
