/**
 * cf-qnn5 Track A — PDP main image srcset/AVIF network assertions.
 *
 * Pins the contract that must hold once cf-h345 Track 2 (next/image swap in
 * PdpGallery) ships. Until then this spec is gated behind two env flags:
 *
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1  — avoids live Wix fetches in CI
 *   NEXT_PUBLIC_PDP_NEXT_IMAGE=1        — set by the cf-h345 Track 2 PR
 *
 * Run when both are active:
 *   NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 NEXT_PUBLIC_PDP_NEXT_IMAGE=1 \
 *     npx playwright test e2e/pdp-image-srcset.spec.ts
 *
 * Contract asserted (all three must pass before removing the skip):
 *   1. PDP main image routes via /_next/image proxy, not direct wixstatic.com
 *   2. AVIF or WebP is served (Vercel image optimizer format negotiation)
 *   3. /_next/image width param (w=) matches the sizes hint for the viewport:
 *      - sizes="(max-width: 768px) 100vw, 600px"
 *      - Desktop 1280px → ~600px CSS → w ∈ [600, 828] (deviceSizes default)
 *      - Mobile  375px  → 100vw=375px → w ∈ [384, 828]
 *
 * Filed by godfrey from cf-h345.t3 5-lens pr-test-analyzer non-blocking note.
 */

import { test, expect } from "@playwright/test";

const KINGSTON = "/products/kingston-futon-frame";
const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";
// Flip to enable: set NEXT_PUBLIC_PDP_NEXT_IMAGE=1 when cf-h345 Track 2 merges.
const isNextImageMode = process.env.NEXT_PUBLIC_PDP_NEXT_IMAGE === "1";

test.describe("PDP main image srcset/AVIF (cf-qnn5 Track A — stub pending cf-h345 Track 2)", () => {
  test.skip(
    !isFixtureMode || !isNextImageMode,
    "requires NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 + NEXT_PUBLIC_PDP_NEXT_IMAGE=1 (cf-h345 Track 2 next/image swap)"
  );
  test.setTimeout(30_000);

  test("main image src uses /_next/image proxy, not direct wixstatic", async ({
    page,
  }) => {
    await page.goto(KINGSTON);
    const main = page.getByTestId("pdp-main-image");
    await expect(main).toBeVisible({ timeout: 15_000 });

    const src = await main.getAttribute("src");
    expect(src, "main image must route through /_next/image optimizer").toContain(
      "/_next/image"
    );
    expect(
      src,
      "main image must NOT hit static.wixstatic.com directly"
    ).not.toContain("wixstatic.com");
  });

  test("main image is served as AVIF or WebP at desktop viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const nextImageResponses: Array<import("@playwright/test").Response> = [];
    page.on("response", (res) => {
      if (
        res.url().includes("/_next/image") &&
        res.request().resourceType() === "image"
      ) {
        nextImageResponses.push(res);
      }
    });

    await page.goto(KINGSTON);
    await expect(page.getByTestId("pdp-main-image")).toBeVisible({
      timeout: 15_000,
    });

    expect(
      nextImageResponses.length,
      "expected at least one /_next/image request for the main image"
    ).toBeGreaterThan(0);

    const mainRes = nextImageResponses[0]!;
    const contentType = mainRes.headers()["content-type"] ?? "";
    expect(
      contentType,
      `expected AVIF or WebP format from image optimizer, got: ${contentType}`
    ).toMatch(/image\/avif|image\/webp/);
  });

  test("/_next/image width param matches sizes hint at desktop (1280px)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    let mainImageUrl: string | null = null;
    page.on("request", (req) => {
      if (
        req.url().includes("/_next/image") &&
        req.resourceType() === "image" &&
        mainImageUrl === null
      ) {
        mainImageUrl = req.url();
      }
    });

    await page.goto(KINGSTON);
    await expect(page.getByTestId("pdp-main-image")).toBeVisible({
      timeout: 15_000,
    });

    expect(
      mainImageUrl,
      "expected a /_next/image request for the PDP main image"
    ).not.toBeNull();

    const url = new URL(mainImageUrl!);
    const w = Number(url.searchParams.get("w"));
    // sizes="(max-width: 768px) 100vw, 600px" at 1280px → browser evaluates to
    // 600px. Next.js default deviceSizes [640,750,...] picks 640. Allow 640-828
    // to handle DPR variants and any future deviceSizes tuning.
    expect(w, `expected w=640 or w=750 for 600px sizes hint, got w=${w}`).toBeGreaterThanOrEqual(600);
    expect(w, `expected w ≤ 828 for desktop sizes hint, got w=${w}`).toBeLessThanOrEqual(828);
  });

  test("/_next/image width param matches sizes hint at mobile (375px)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    let mainImageUrl: string | null = null;
    page.on("request", (req) => {
      if (
        req.url().includes("/_next/image") &&
        req.resourceType() === "image" &&
        mainImageUrl === null
      ) {
        mainImageUrl = req.url();
      }
    });

    await page.goto(KINGSTON);
    await expect(page.getByTestId("pdp-main-image")).toBeVisible({
      timeout: 15_000,
    });

    expect(
      mainImageUrl,
      "expected a /_next/image request for the PDP main image"
    ).not.toBeNull();

    const url = new URL(mainImageUrl!);
    const w = Number(url.searchParams.get("w"));
    // sizes="(max-width: 768px) 100vw, 600px" at 375px → 100vw = 375px.
    // Next.js picks nearest deviceSize at or above 375 → 384 or 640.
    // Allow 384-828 to cover DPR and responsive variant ranges.
    expect(w, `expected w ≥ 384 for 375px mobile viewport, got w=${w}`).toBeGreaterThanOrEqual(384);
    expect(w, `expected w ≤ 828 for mobile sizes hint, got w=${w}`).toBeLessThanOrEqual(828);
  });
});
