import { test, expect } from "@playwright/test";

test.describe("home — blog teasers section", () => {
  test("blog teasers section renders with heading, cards, and All-posts link", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const section = page.locator('[data-slot="blog-teasers"]');

    // Verify section visible at default viewport
    await expect(section).toBeVisible();

    // "From the blog" heading
    await expect(
      section.getByRole("heading", { name: /from the blog/i }),
    ).toBeVisible();

    // "All posts" link to /blog
    const allPostsLink = section.getByRole("link", { name: /all posts/i });
    await expect(allPostsLink).toBeVisible();
    await expect(allPostsLink).toHaveAttribute("href", "/blog");

    // At least one blog teaser card present
    const cards = section.locator('[data-slot="blog-teaser-card"]');
    await expect(cards.first()).toBeVisible();
  });

  for (const width of [375, 768, 1280]) {
    test(`renders correctly at ${width}px viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "domcontentloaded" });

      const section = page.locator('[data-slot="blog-teasers"]');
      await expect(section).toBeVisible();
      await expect(
        section.getByRole("heading", { name: /from the blog/i }),
      ).toBeVisible();
    });
  }

  test("no console errors on page load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(errors).toHaveLength(0);
  });
});
