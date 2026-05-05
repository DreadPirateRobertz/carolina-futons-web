import { test, expect } from "@playwright/test";

test.describe("/referral — member gate", () => {
  test("unauthenticated visitor is redirected to /account with next param", async ({
    page,
  }) => {
    await page.goto("/referral");
    await expect(page).toHaveURL(/\/account\?next=%2Freferral/);
  });
});

test.describe("/referral/share/[code] — public landing", () => {
  test("invalid code shows 404", async ({ page }) => {
    await page.goto("/referral/share/INVALID-CODE-00000");
    await expect(page).toHaveURL(/\/referral\/share\/INVALID-CODE-00000/);
    // Next.js not-found renders a 404 page — check for absence of share banner content
    await expect(page.getByText("Get", { exact: false })).not.toBeVisible();
  });
});
