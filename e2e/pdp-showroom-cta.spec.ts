/**
 * PDP showroom CTA E2E (cfw-tbg) — fixture mode.
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/pdp-showroom-cta.spec.ts
 *
 * Validates the "Try it in our showroom" card renders below the buy-box on a
 * fixture PDP and the "Get Directions" link points at Google Maps. The 375px
 * mobile assertion guards against a regression where the card overflows the
 * viewport (the original spec calls out 'collapses cleanly at 375px').
 */

import { test, expect } from "@playwright/test";

const KINGSTON = "/products/kingston-futon-frame";
const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

test.describe("PDP showroom CTA (cfw-tbg)", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(30_000);

  test("desktop: card renders with address, hours, and a Maps link", async ({
    page,
  }) => {
    await page.goto(KINGSTON);

    const card = page.locator('[data-slot="pdp-showroom-cta"]');
    await expect(card).toBeVisible({ timeout: 15_000 });

    await expect(card.getByRole("heading", { name: /try it in our showroom/i }))
      .toBeVisible();
    await expect(card.getByText(/824 Locust/)).toBeVisible();
    await expect(card.getByText(/Hendersonville/)).toBeVisible();
    await expect(card.getByText(/Wed.{1,3}Sat 10am.{1,3}5pm/)).toBeVisible();

    const link = card.locator('[data-testid="showroom-directions-link"]');
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    expect(href).toContain(encodeURIComponent("824 Locust"));
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("mobile 375px: card stays within the viewport (no horizontal overflow)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await page.goto(KINGSTON);

    const card = page.locator('[data-slot="pdp-showroom-cta"]');
    await expect(card).toBeVisible({ timeout: 15_000 });

    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Card must fit in the 375px viewport — primary failure mode for
      // unwrapped flex rows or fixed-width children.
      expect(box.width).toBeLessThanOrEqual(375);
    }
  });
});
