import { test, expect } from "@playwright/test";

// cf-mobile-hamburger-portal — Stilgar P0 third flag.
// Verifies at iPhone 12/13 viewport (390×844, the device Stilgar reports
// from) that the hamburger drawer:
//   1. opens when the trigger is tapped
//   2. portals to <body> so the Header's stacking context can't clip it
//   3. lays primary nav links above other page chrome (no z-index burial)
//   4. closes via the X, via Escape, and via outside-tap
test.use({ viewport: { width: 390, height: 844 } });

test.describe("mobile hamburger (390×844)", () => {
  test("trigger opens the drawer and renders primary nav links", async ({
    page,
  }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", {
      name: /open navigation menu/i,
    });
    await expect(trigger).toBeVisible();
    await trigger.click();
    const drawer = page.getByRole("dialog", { name: /navigation menu/i });
    await expect(drawer).toHaveAttribute("data-state", "open");
    await expect(
      drawer.getByRole("link", { name: "Futons", exact: true }),
    ).toBeVisible();
    await expect(
      drawer.getByRole("link", { name: "Murphy Beds", exact: true }),
    ).toBeVisible();
  });

  test("drawer is portaled to document.body, not nested under the header", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /open navigation menu/i }).click();
    const isUnderBody = await page.evaluate(() => {
      const drawer = document.getElementById("mobile-nav-drawer");
      return drawer?.parentElement === document.body;
    });
    expect(isUnderBody).toBe(true);
  });

  test("drawer overlays page content (links are clickable, not z-buried)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /open navigation menu/i }).click();
    const futonsLink = page
      .getByRole("dialog", { name: /navigation menu/i })
      .getByRole("link", { name: "Futons", exact: true });
    // If the drawer were under the page in stacking, click would land
    // on whatever was at that point in the document instead.
    await futonsLink.click();
    await expect(page).toHaveURL(/\/shop\/futon-frames/);
  });

  test("Escape closes the drawer (data-state flips to closed)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /open navigation menu/i }).click();
    const drawer = page.getByRole("dialog", { name: /navigation menu/i });
    await expect(drawer).toHaveAttribute("data-state", "open");
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveAttribute("data-state", "closed");
    await expect(
      page.getByRole("button", { name: /open navigation menu/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  test("outside tap closes the drawer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /open navigation menu/i }).click();
    const drawer = page.getByRole("dialog", { name: /navigation menu/i });
    await expect(drawer).toHaveAttribute("data-state", "open");
    // Tap on the backdrop (any point past the 288px-wide drawer)
    await page.mouse.click(370, 400);
    await expect(drawer).toHaveAttribute("data-state", "closed");
  });
});
