/**
 * Pin the /account + /account/forgot-password a11y contract:
 *  - Helper text uses /80 (or no opacity) — /60 measures ~4.4:1 against
 *    the page surface and fails WCAG AA's 4.5:1 floor on 12px copy.
 *  - Inline links carry persistent `underline` (not `hover:underline`)
 *    so the affordance survives WCAG 1.4.1 for users with color-vision
 *    differences.
 *  - Dark-mode opacity helpers use `dark:text-cf-charcoal` (a true
 *    text token in dark mode) — NOT `dark:text-cf-cream`, which
 *    globals.css redefines as the card surface color and therefore
 *    fails contrast as a text color.
 *
 * Regex assertions are class-order-agnostic — Tailwind class-sort
 * may shuffle `underline` and `text-cf-cta` in either order. We assert
 * both tokens are present in the same className, not their position.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SIGN_IN = readFileSync(
  resolve(__dirname, "../components/account/AccountSignIn.tsx"),
  "utf8",
);
const FORGOT = readFileSync(
  resolve(__dirname, "../components/account/ForgotPasswordForm.tsx"),
  "utf8",
);

/**
 * Return all classNames containing the target href so we can assert
 * on token presence without locking class order. Pulls the
 * `className="..."` value out of the matching <Link>/<button> tag.
 */
function linkClassesFor(src: string, href: string): string[] {
  const re = new RegExp(`href="${href.replace(/\//g, "\\/")}"[^>]*?className="([^"]+)"`, "g");
  const out: string[] = [];
  for (const m of src.matchAll(re)) out.push(m[1]!);
  return out;
}

describe("AccountSignIn a11y (cf-2oku)", () => {
  it("helper paragraphs use /80 opacity (or no opacity) — never /60", () => {
    // The 3 helper paragraphs at lines 74/96/169/175 should all carry /80.
    expect(SIGN_IN).toMatch(/text-cf-charcoal\/80 dark:text-cf-charcoal/);
    // Hard ban on the failure shape: text-xs|sm + opacity-60 helper
    // paragraph that triggered the original Lighthouse failure.
    expect(SIGN_IN).not.toMatch(/text-cf-charcoal\/60/);
  });

  it("does NOT use dark:text-cf-cream (a surface color) as a text class", () => {
    // dark:text-cf-cream/* points at globals.css --cf-cream which dark
    // mode redefines to the CARD SURFACE color (#263545). Using it as a
    // text class puts near-black-on-dark — a contrast regression.
    expect(SIGN_IN).not.toMatch(/dark:text-cf-cream\/(60|80)/);
  });

  it("/dashboard link is distinguishable without color (persistent underline)", () => {
    const classes = linkClassesFor(SIGN_IN, "/dashboard");
    expect(classes.length).toBeGreaterThan(0);
    // All occurrences must carry both tokens (order-agnostic).
    for (const cls of classes) {
      expect(cls).toMatch(/\btext-cf-cta\b/);
      expect(cls).toMatch(/\bunderline\b/);
      expect(cls).not.toMatch(/\bhover:underline\b/);
    }
  });

  it("/signup link is distinguishable without color (persistent underline)", () => {
    const classes = linkClassesFor(SIGN_IN, "/signup");
    expect(classes.length).toBeGreaterThan(0);
    for (const cls of classes) {
      expect(cls).toMatch(/\btext-cf-cta\b/);
      expect(cls).toMatch(/\bunderline\b/);
      expect(cls).not.toMatch(/\bhover:underline\b/);
    }
  });

  it("/account/forgot-password link uses persistent underline", () => {
    const classes = linkClassesFor(SIGN_IN, "/account/forgot-password");
    expect(classes.length).toBeGreaterThan(0);
    for (const cls of classes) {
      expect(cls).toMatch(/\bunderline\b/);
      expect(cls).not.toMatch(/\bhover:underline\b/);
    }
  });

  it("'Back to sign in' button (verify-pending branch) uses persistent underline", () => {
    // Button, not Link — same WCAG 1.4.1 requirement applies.
    const m = SIGN_IN.match(/Back to sign in[\s\S]{0,200}/) ?? [""];
    // The button is rendered ABOVE the text "Back to sign in" so the
    // className appears in the 200 chars preceding the literal. Grab
    // the class via a broader window.
    const before = SIGN_IN.split("Back to sign in")[0] ?? "";
    const lastButton = before.lastIndexOf("<button");
    const buttonTag = before.slice(lastButton, lastButton + 400);
    expect(buttonTag).toMatch(/\bunderline\b/);
    expect(buttonTag).not.toMatch(/\bhover:underline\b/);
    void m;
  });
});

describe("ForgotPasswordForm a11y (cf-2oku — cascade fix)", () => {
  it("helper paragraph uses /80 — never /60", () => {
    expect(FORGOT).toMatch(/text-cf-charcoal\/80/);
    expect(FORGOT).not.toMatch(/text-cf-charcoal\/60/);
  });

  it("'Back to sign in' Links use persistent underline", () => {
    const classes = linkClassesFor(FORGOT, "/account");
    expect(classes.length).toBeGreaterThan(0);
    for (const cls of classes) {
      expect(cls).toMatch(/\btext-cf-cta\b/);
      expect(cls).toMatch(/\bunderline\b/);
      expect(cls).not.toMatch(/\bhover:underline\b/);
    }
  });
});
