// cfw-mny.1: structural a11y primitives the cf-7tkf audit confirmed are
// present in the layout. Locking them under CI prevents a future refactor
// from silently removing them.
//
// Out of scope (parent cfw-mny owns these):
//   - axe-core / Lighthouse runtime pass (needs @axe-core/playwright dep
//     decision + Vercel-credit window per cf-ukc6).
//   - Screen-reader walkthrough (NVDA/VoiceOver).
//   - Keyboard-only end-to-end (home → PLP → PDP → cart → checkout).
//
// Targets `/smoke` because it renders the full layout shell and is the
// existing canary route used by smoke.spec.ts (security headers); piggybacks
// on the same dev-server boot.

import { test, expect } from "@playwright/test";

test.describe("a11y smoke — layout structural primitives (cfw-mny.1)", () => {
  test("html element declares lang='en'", async ({ page }) => {
    await page.goto("/smoke");
    // The lang attribute drives screen-reader pronunciation and is required
    // by WCAG 3.1.1 Language of Page.
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("skip link is present and targets #main (WCAG 2.4.1 Bypass Blocks)", async ({
    page,
  }) => {
    await page.goto("/smoke");
    // Skip link is the first focusable anchor in the body (sr-only until
    // focus). It must point at the canonical app-main id so keyboard users
    // can bypass the header on every page.
    const skip = page.locator('a[href="#main"]', { hasText: /skip to main/i });
    await expect(skip).toHaveCount(1);
    // sr-only by default, revealed on focus — verify the class composition
    // rather than visibility (visibility before focus is intentional false).
    await expect(skip).toHaveClass(/sr-only/);
    await expect(skip).toHaveClass(/focus:not-sr-only/);
  });

  test("skip-link target #main exists in the document (WCAG 2.4.1)", async ({
    page,
  }) => {
    await page.goto("/smoke");
    // The layout's <main id="main"> is the skip-link's only landing target.
    // If this id moves or duplicates, the skip link silently breaks for AT.
    const main = page.locator("main#main");
    await expect(main).toHaveCount(1);
  });

  test("focusing the skip link reveals it (sr-only → focus-visible)", async ({
    page,
  }) => {
    await page.goto("/smoke");
    const skip = page.locator('a[href="#main"]', { hasText: /skip to main/i });
    await skip.focus();
    // Once focused, the focus:not-sr-only class composition makes the link
    // visible. Use Playwright's auto-retry visibility check.
    await expect(skip).toBeVisible();
  });
});
