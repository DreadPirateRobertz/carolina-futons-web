import { test, expect } from "@playwright/test";

test.describe("/smoke", () => {
  test("renders heading and status line", async ({ page }) => {
    await page.goto("/smoke");
    await expect(page.locator("h1")).toContainText("/smoke");
    // The /smoke page renders its own <main> nested inside the layout's <main id="main">,
    // so locator("main") returns 2 elements and trips Playwright strict mode. Scope to the
    // layout's canonical app-main; both contain "Status:" since one wraps the other.
    await expect(page.locator("main").first()).toContainText("Status:");
  });

  test("lists the 4 smoke check cards", async ({ page }) => {
    await page.goto("/smoke");
    await expect(page.getByText("Product query (limit 1)")).toBeVisible();
    await expect(page.getByText("CMS: WelcomeVisitors (limit 1)")).toBeVisible();
    await expect(page.getByText("CMS: Promotions (limit 1)")).toBeVisible();
    await expect(
      page.getByText("Velo HTTP function: /_functions/health (CORS)"),
    ).toBeVisible();
  });

  test("every check has a PASS or FAIL badge", async ({ page }) => {
    await page.goto("/smoke");
    const badges = page.locator("main >> text=/^(PASS|FAIL)$/");
    await expect(badges).toHaveCount(4);
  });

  test("security middleware headers are present", async ({ request }) => {
    const res = await request.get("/smoke");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["referrer-policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(res.headers()["strict-transport-security"]).toContain("max-age=31536000");
    expect(res.headers()["strict-transport-security"]).toContain("includeSubDomains");
    expect(res.headers()["permissions-policy"]).toContain("payment=()");
    expect(res.headers()["x-dns-prefetch-control"]).toBe("on");
  });
});
