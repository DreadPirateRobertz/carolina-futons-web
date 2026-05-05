import { test, expect } from "@playwright/test";

test.describe("/account — Forgot password link", () => {
  test("sign-in page exposes a 'Forgot your password?' link to /account/forgot-password", async ({
    page,
  }) => {
    await page.goto("/account");
    const link = page.getByRole("link", { name: /forgot your password/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/account/forgot-password");
  });

  test("clicking the link routes to the forgot-password form", async ({
    page,
  }) => {
    await page.goto("/account");
    await page.getByRole("link", { name: /forgot your password/i }).click();
    await expect(page).toHaveURL(/\/account\/forgot-password$/);
    await expect(
      page.getByRole("heading", { name: /forgot your password/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send reset link/i }),
    ).toBeVisible();
  });
});

test.describe("/api/auth/forgot-password — request validation", () => {
  test("rejects a missing email with 400", async ({ request }) => {
    const res = await request.post("/api/auth/forgot-password", {
      data: {},
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/valid email/i);
  });

  test("rejects a malformed email with 400", async ({ request }) => {
    const res = await request.post("/api/auth/forgot-password", {
      data: { email: "not-an-email" },
    });
    expect(res.status()).toBe(400);
  });
});
