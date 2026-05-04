import { test, expect } from "@playwright/test";

test.describe("/dashboard — member gate (no live Wix creds needed)", () => {
  test("unauthenticated visitor is redirected to / with auth_required query", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/\?auth_required=1/);
  });

  test("redirect preserves on nested account routes (scaffolded or not)", async ({
    page,
  }) => {
    await page.goto("/dashboard/orders");
    // Gate fires before the child segment resolves — same redirect target.
    await expect(page).toHaveURL(/\/\?auth_required=1/);
  });
});

// Full login → dashboard round-trip is now covered by e2e/member.spec.ts
// running under the "member" Playwright project (storageState from auth.setup.ts).
