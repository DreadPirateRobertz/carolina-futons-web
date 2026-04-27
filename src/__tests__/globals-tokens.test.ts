import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// cf-3qt.1 Phase 1 — token contract guard.
// Asserts globals.css keeps the brand hex values + chrome pixel specs from
// docs/migration/cf-3qt-phase1-prep.md. Edits that drift these values must
// update this test intentionally.

const css = readFileSync(
  resolve(__dirname, "../app/globals.css"),
  "utf8"
);

describe("globals.css — CF brand tokens", () => {
  it.each([
    ["--cf-navy", "#1e3a5f"],
    ["--cf-blue", "#5b8fa8"],
    ["--cf-cta", "#4a7d94"],
    ["--cf-cta-hover", "#3d6a80"],
    ["--cf-sand", "#f0f4f8"],
    ["--cf-cream", "#fefcf7"],
    ["--cf-espresso", "#3a2518"],
    ["--cf-charcoal", "#1a1a1a"],
    ["--cf-divider", "#e2e8f0"],
    ["--cf-success", "#2f855a"],
    ["--cf-warning", "#c05621"],
    ["--cf-error", "#c53030"],
  ])("defines %s = %s", (token, value) => {
    const re = new RegExp(`${token}:\\s*${value};`, "i");
    expect(css).toMatch(re);
  });
});

describe("globals.css — chrome pixel specs", () => {
  it.each([
    ["--cf-header-top", "60px"],
    ["--cf-header-main", "93px"],
    ["--cf-header-sub", "60px"],
    ["--cf-header-total", "213px"],
    ["--cf-footer-main", "72px"],
    ["--cf-footer-bottom", "36px"],
    ["--cf-footer-total", "108px"],
  ])("defines %s = %s", (token, value) => {
    const re = new RegExp(`${token}:\\s*${value};`);
    expect(css).toMatch(re);
  });
});

describe("globals.css — Tailwind @theme wiring", () => {
  it("exposes --color-cf-* utilities for direct class use", () => {
    ["cf-navy", "cf-cta", "cf-sand", "cf-cream", "cf-divider"].forEach((t) => {
      expect(css).toMatch(new RegExp(`--color-${t}:\\s*var\\(--${t}\\)`));
    });
  });

  it("exposes --height-cf-header / --height-cf-footer utilities", () => {
    expect(css).toMatch(/--height-cf-header:\s*var\(--cf-header-total\)/);
    expect(css).toMatch(/--height-cf-footer:\s*var\(--cf-footer-total\)/);
  });

  it("wires Playfair as font-heading and Source Sans as font-sans", () => {
    expect(css).toMatch(/--font-sans:\s*var\(--font-source-sans\)/);
    expect(css).toMatch(/--font-heading:\s*var\(--font-playfair\)/);
  });
});

describe("globals.css — accessibility", () => {
  it("honors prefers-reduced-motion (WCAG 2.3.3)", () => {
    expect(css).toMatch(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/);
  });
});

describe("globals.css — dark mode CF brand token overrides (cf-uyeq)", () => {
  // Guards that the .dark block flips text-color tokens to light values so
  // text-cf-ink / text-cf-charcoal / text-cf-espresso pass WCAG AA contrast
  // against the dark --background. NOTE: darkSection runs from `.dark {` to
  // the first top-level closing brace — not all the way to end-of-file — so
  // tokens defined in later rule sets (media queries, etc.) won't falsely pass.
  function inDarkBlock(token: string, value: string) {
    const start = css.indexOf(".dark {");
    const end = css.indexOf("\n}", start);
    const darkSection = css.slice(start, end);
    return new RegExp(`${token}:\\s*${value}`).test(darkSection);
  }

  it("overrides --cf-ink to a light value in .dark", () => {
    expect(inDarkBlock("--cf-ink", "#e8eef4")).toBe(true);
  });

  it("overrides --cf-charcoal to a light value in .dark", () => {
    expect(inDarkBlock("--cf-charcoal", "#e2eaf0")).toBe(true);
  });

  it("overrides --cf-espresso to a warm-light value in .dark", () => {
    expect(inDarkBlock("--cf-espresso", "#f0e4d4")).toBe(true);
  });

  it("overrides --cf-cta to a lighter blue in .dark (links/interactive text)", () => {
    expect(inDarkBlock("--cf-cta", "#7ab8d0")).toBe(true);
  });

  it("overrides --cf-navy to a lighter value in .dark (outline buttons)", () => {
    expect(inDarkBlock("--cf-navy", "#7ab0c8")).toBe(true);
  });

  it("overrides --cf-sand to dark bg in .dark (prevents light flash)", () => {
    expect(inDarkBlock("--cf-sand", "#1e2a3a")).toBe(true);
  });

  it("overrides --cf-cream to dark card surface in .dark", () => {
    expect(inDarkBlock("--cf-cream", "#263545")).toBe(true);
  });
});
