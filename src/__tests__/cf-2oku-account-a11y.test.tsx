/**
 * cf-2oku (cf-d41j.fu1): pin the /account a11y fix so a future class-
 * cleanup doesn't accidentally roll the contrast back to /60 or strip
 * the persistent underline.
 *
 * Sources:
 *  - Lighthouse audit at /tmp/cf-d41j/cfw-account.json measured the
 *    pre-fix `text-cf-charcoal/60` text at 4.4:1 contrast — just below
 *    WCAG AA's 4.5:1 floor for normal text.
 *  - The `text-cf-cta hover:underline` links measured 1.19:1 contrast
 *    against the surrounding text (WCAG 1.4.1 needs 3:1 OR a non-color
 *    distinguisher).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = readFileSync(
  resolve(__dirname, "../components/account/AccountSignIn.tsx"),
  "utf8",
);

describe("AccountSignIn a11y (cf-2oku)", () => {
  it("secondary paragraphs use /80 opacity (WCAG AA contrast) — not /60", () => {
    // Find the two "Already signed in?" / "Don't have an account?" paragraphs.
    expect(SRC).toMatch(/text-cf-charcoal\/80 dark:text-cf-cream\/80/);
    // Pin the regression: NO `/60` remaining on the bottom paragraphs.
    // Other /60 in unrelated DOM is fine, but the pattern asserted here
    // (text-xs + center + /60) is the failure shape Lighthouse caught.
    expect(SRC).not.toMatch(
      /text-center text-xs text-cf-charcoal\/60 dark:text-cf-cream\/60/,
    );
  });

  it("secondary links carry a persistent underline (not hover-only)", () => {
    // Pre-fix: `text-cf-cta hover:underline` on /dashboard + /signup links.
    // Post-fix: `text-cf-cta underline underline-offset-2` so the link
    // affordance is visible to all users (WCAG 1.4.1).
    expect(SRC).toMatch(
      /<Link href="\/dashboard"[^>]*className="text-cf-cta underline/,
    );
    expect(SRC).toMatch(
      /<Link href="\/signup"[^>]*className="text-cf-cta underline/,
    );
    // Pin against revert: the standalone `hover:underline` shape is gone
    // on these two surfaces.
    expect(SRC).not.toMatch(
      /<Link href="\/dashboard"[^>]*className="text-cf-cta hover:underline"/,
    );
    expect(SRC).not.toMatch(
      /<Link href="\/signup"[^>]*className="text-cf-cta hover:underline"/,
    );
  });
});
