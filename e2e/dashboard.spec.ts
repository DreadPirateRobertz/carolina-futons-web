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

// Full login → dashboard round-trip. Requires a real OAuth App clientId in env
// plus a seeded test member. Skipped by default; flip on when staging env is
// configured with WIX_CLIENT_ID_HEADLESS + TEST_MEMBER_EMAIL / TEST_MEMBER_PASSWORD.
const FULL_FLOW = Boolean(
  process.env.TEST_MEMBER_EMAIL && process.env.TEST_MEMBER_PASSWORD,
);

test.describe("dashboard round-trip (staging only)", () => {
  test.skip(
    !FULL_FLOW,
    "Set TEST_MEMBER_EMAIL + TEST_MEMBER_PASSWORD to run the full login → dashboard flow.",
  );

  test("logged-in member lands on the dashboard shell", async ({ page }) => {
    // Kick the OAuth flow via the same POST the UI will hit.
    const post = await page.request.post("/api/auth/session", {
      data: { callbackUrl: "/dashboard" },
    });
    expect(post.ok()).toBeTruthy();
    const { authUrl } = (await post.json()) as { authUrl: string };

    await page.goto(authUrl);
    await page.getByLabel(/email/i).fill(process.env.TEST_MEMBER_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.TEST_MEMBER_PASSWORD!);
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /Welcome back/i,
    );
    await expect(
      page.getByRole("navigation", { name: "Account sections" }),
    ).toBeVisible();
  });
});
