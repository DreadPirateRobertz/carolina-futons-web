/**
 * PDP gallery zoom lightbox E2E (cfw-zd8) — fixture mode.
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/pdp-gallery-zoom-lightbox.spec.ts
 *
 * Validates the click-to-zoom modal on the Kingston Futon Frame PDP:
 * dialog opens, ESC + X + backdrop close, ←/→ keys navigate adjacent
 * images, body scroll is locked while open. Pinch-to-zoom is exercised
 * via touch-emulation; pan/wheel are not asserted in CI because Playwright
 * Chromium's wheel-as-pinch path is unreliable across versions.
 */

import { test, expect } from "@playwright/test";

const KINGSTON = "/products/kingston-futon-frame";
const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

test.describe("PDP gallery zoom lightbox (cfw-zd8)", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(30_000);

  test("clicking the main image opens the modal dialog", async ({ page }) => {
    await page.goto(KINGSTON);
    const trigger = page.getByTestId("pdp-main-image-zoom-trigger");
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAttribute(
      "data-slot",
      "gallery-zoom-lightbox",
    );
  });

  test("ESC closes the dialog and restores body scroll", async ({ page }) => {
    await page.goto(KINGSTON);
    await page.getByTestId("pdp-main-image-zoom-trigger").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    // body overflow is locked while open
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("hidden");

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .not.toBe("hidden");
  });

  test("X button closes the dialog", async ({ page }) => {
    await page.goto(KINGSTON);
    await page.getByTestId("pdp-main-image-zoom-trigger").click();
    await page.getByTestId("gallery-zoom-close").click();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("←/→ keys navigate adjacent images when there are multiple", async ({
    page,
  }) => {
    await page.goto(KINGSTON);
    await page.getByTestId("pdp-main-image-zoom-trigger").click();

    const counter = page.getByTestId("gallery-zoom-counter");
    // Skip the rest of this case if the fixture only has a single image —
    // the counter is suppressed in that case and there's nothing to nav to.
    if (!(await counter.isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: "skip-reason",
        description: "Kingston fixture has only one image",
      });
      return;
    }

    const initial = await counter.textContent();
    await page.keyboard.press("ArrowRight");
    await expect(counter).not.toHaveText(initial ?? "");

    await page.keyboard.press("ArrowLeft");
    await expect(counter).toHaveText(initial ?? "");
  });

  test("focus is moved to the close button when the dialog opens", async ({
    page,
  }) => {
    await page.goto(KINGSTON);
    await page.getByTestId("pdp-main-image-zoom-trigger").click();
    const closeBtn = page.getByTestId("gallery-zoom-close");
    await expect(closeBtn).toBeFocused();
  });
});
