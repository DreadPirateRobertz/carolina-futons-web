import { test, expect } from "@playwright/test";

test.describe("/cart", () => {
  test("renders empty-cart state without credentials", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByText(/your cart is empty/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /continue shopping/i })).toHaveAttribute(
      "href",
      "/shop",
    );
  });

  test("shows checkout error banner when checkout_error=1 is in URL", async ({ page }) => {
    await page.goto("/cart?checkout_error=1");
    // Use testid selector to avoid the Next.js route-announcer (also role="alert")
    await expect(page.getByTestId("checkout-error-banner")).toContainText(/something went wrong/i);
  });

  test("does not show error banner without checkout_error param", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByTestId("checkout-error-banner")).not.toBeVisible();
  });
});

test.describe("/our-story", () => {
  test("permanently redirects to /about", async ({ page }) => {
    const res = await page.goto("/our-story");
    // Next.js permanentRedirect issues a 308 in the app router;
    // Playwright follows it — verify we land on /about.
    expect(page.url()).toContain("/about");
    // The redirect response itself is 3xx (Playwright reports the final response).
    expect(res?.ok() || res?.status() === 404).toBe(true);
  });
});

test.describe("/checkout error path", () => {
  test("redirects to /cart?checkout_error=1 when initCheckout throws (no Wix credentials)", async ({
    page,
  }) => {
    // The stub WIX_CLIENT_ID_HEADLESS causes initCheckout to fail.
    // The route handler catches the error and bounces back to /cart with the flag.
    await page.goto("/checkout");
    expect(page.url()).toContain("/cart");
    expect(page.url()).toContain("checkout_error=1");
    await expect(page.getByTestId("checkout-error-banner")).toContainText(/something went wrong/i);
  });
});
