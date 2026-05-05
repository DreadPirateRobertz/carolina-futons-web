/**
 * Cart persistence E2E (cfw-7so) — fixture mode.
 *
 * Run with:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 npx playwright test e2e/cart-persistence.spec.ts
 *
 * The bug: clicking Add to cart on a PDP opened the drawer with the line
 * (in-memory state), but navigating to /cart rendered "Your cart is empty"
 * because the hard-nav remount of CartProvider lost the state and the
 * server-side hydrate either had no Wix session cookie (fixture mode) or
 * raced the cart write (real Wix on first visit).
 *
 * The fix: CartProvider persists its state to localStorage and rehydrates on
 * mount, so a hard nav from PDP to /cart paints the cart synchronously while
 * the server hydrate settles in the background.
 */

import { test, expect } from "@playwright/test";

const KINGSTON = "/products/kingston-futon-frame";
const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

test.describe("cart persistence — PDP → /cart (cfw-7so)", () => {
  test.skip(!isFixtureMode, "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1");
  test.setTimeout(30_000);

  test("PDP add to cart → /cart shows the item", async ({ page }) => {
    await page.goto(KINGSTON);

    const addBtn = page.locator('button:has-text("Add to cart")');
    await expect(addBtn).toBeEnabled({ timeout: 15_000 });
    await addBtn.click();

    // Drawer opens with the item.
    const drawer = page.locator('[data-testid="cart-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 5_000 });
    await expect(drawer.locator('[data-testid="cart-line"]')).toBeVisible();

    // Hard nav to /cart — this is the failure case in the original bug.
    await page.goto("/cart");

    // Cart page must show the line, not the empty-state copy.
    const cartLine = page.locator('[data-testid="cart-line"]');
    await expect(cartLine).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/your cart is empty/i)).toHaveCount(0);

    // Subtotal reflects Kingston price ($399) — proves the hydrated line is
    // the same one we added, not a stub.
    const subtotal = page.locator('[data-testid="cart-subtotal"]');
    await expect(subtotal).toContainText("399");
  });

  test("cart persists across a page reload", async ({ page }) => {
    await page.goto(KINGSTON);
    await page.locator('button:has-text("Add to cart")').click();
    await expect(page.locator('[data-testid="cart-drawer"]')).toBeVisible({
      timeout: 5_000,
    });

    await page.goto("/cart");
    await expect(page.locator('[data-testid="cart-line"]')).toBeVisible();

    await page.reload();
    await expect(page.locator('[data-testid="cart-line"]')).toBeVisible();
  });

  test("cart persists across new tabs in the same browser context", async ({
    context,
    page,
  }) => {
    await page.goto(KINGSTON);
    await page.locator('button:has-text("Add to cart")').click();
    await expect(page.locator('[data-testid="cart-drawer"]')).toBeVisible({
      timeout: 5_000,
    });

    // localStorage is scoped to the browser context, shared across tabs.
    const newTab = await context.newPage();
    await newTab.goto("/cart");
    await expect(newTab.locator('[data-testid="cart-line"]')).toBeVisible();
  });
});
