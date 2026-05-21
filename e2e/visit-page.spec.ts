/**
 * /visit page smoke tests — cfw-qii
 *
 * Verifies the showroom visit page renders its key content: heading, store
 * hours, Get directions link, address and phone. The page is a pure Server
 * Component with getSiteContent fallbacks — tests use the hardcoded defaults
 * (e.g. "Visit Us", "10 am – 5 pm") which render whenever the CMS is absent.
 *
 * Run with:
 *   npx playwright test e2e/visit-page.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

const PAGE_TIMEOUT = 15_000;

async function gotoVisit(page: Page) {
  await page.goto("/visit");
  await page.getByRole("heading", { level: 1 }).waitFor({
    state: "visible",
    timeout: PAGE_TIMEOUT,
  });
}

test.describe("/visit — page smoke", () => {
  test.setTimeout(30_000);

  test("h1 is visible on page load", async ({ page }) => {
    await gotoVisit(page);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    // Fallback copy from VISIT_COPY_FALLBACKS.introHeading
    await expect(h1).toContainText(/visit us/i);
  });

  test("store hours section is present with day/hours rows", async ({
    page,
  }) => {
    await gotoVisit(page);
    // The hours section is labeled by "Store Hours" h2
    const hoursSection = page.getByRole("region", {
      name: /store hours/i,
    });
    await expect(hoursSection).toBeVisible();
    // At least the Sunday–Tuesday row from the fallback schedule
    await expect(hoursSection.getByText(/sunday/i)).toBeVisible();
    await expect(hoursSection.getByText(/10 am/i)).toBeVisible();
  });

  test("Get directions link is present and points to Google Maps", async ({
    page,
  }) => {
    await gotoVisit(page);
    // Rendered as <a href="https://maps.google.com/..."> — role is "link"
    const link = page.getByRole("link", { name: /get directions/i });
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).toMatch(/maps\.google\.com/);
  });

  test("address and phone are visible", async ({ page }) => {
    await gotoVisit(page);
    // Street address from BUSINESS constant
    await expect(page.getByText(/824 locust street/i)).toBeVisible();
    await expect(page.getByText(/hendersonville/i).first()).toBeVisible();
    // Phone link (tel:) — appears as "(828) 252-9449"
    const phoneLink = page.getByRole("link", { name: /828.*252.*9449/i });
    await expect(phoneLink).toBeVisible();
    const href = await phoneLink.getAttribute("href");
    expect(href).toBe("tel:+18282529449");
  });

  test("page loads with no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/visit");
    await page.getByRole("heading", { level: 1 }).waitFor({
      state: "visible",
      timeout: PAGE_TIMEOUT,
    });

    expect(consoleErrors).toHaveLength(0);
  });
});
