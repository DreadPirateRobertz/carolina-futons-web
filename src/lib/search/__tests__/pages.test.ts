// cf-76a (cf-ruhm.1): unit tests for the static Pages search manifest.
// Drives `searchPages` across happy-path, empty inputs, case insensitivity,
// keyword matches, description matches, limit slicing, and manifest
// integrity (no duplicate slugs, every slug starts with `/`).

import { describe, it, expect } from "vitest";

import { searchPages, PAGES } from "@/lib/search/pages";

describe("searchPages — happy path", () => {
  it("matches title substring (case-insensitive)", () => {
    const results = searchPages("futon");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((p) => p.slug === "/futon-sommelier")).toBe(true);
  });

  it("matches description substring", () => {
    const results = searchPages("hendersonville");
    // Both /about and /faq mention hendersonville
    expect(results.some((p) => p.slug === "/about")).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("matches keyword substring", () => {
    // /accessibility lists 'wcag' as a keyword
    const results = searchPages("wcag");
    expect(results.map((p) => p.slug)).toEqual(["/accessibility"]);
  });

  it("matches case-insensitively across all fields", () => {
    const lower = searchPages("warranty");
    const upper = searchPages("WARRANTY");
    const mixed = searchPages("WaRrAnTy");
    expect(lower.map((p) => p.slug).sort()).toEqual(
      upper.map((p) => p.slug).sort(),
    );
    expect(lower.map((p) => p.slug).sort()).toEqual(
      mixed.map((p) => p.slug).sort(),
    );
  });
});

describe("searchPages — empty / whitespace q", () => {
  it("returns [] for empty string", () => {
    expect(searchPages("")).toEqual([]);
  });

  it("returns [] for whitespace-only q", () => {
    expect(searchPages("   ")).toEqual([]);
  });

  it("returns [] for q with no matches", () => {
    expect(searchPages("zzzzzz-no-such-term")).toEqual([]);
  });
});

describe("searchPages — limit", () => {
  it("respects the limit parameter (slices AFTER filtering)", () => {
    // "a" appears in many manifest entries; limit it.
    const results = searchPages("a", 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("uses default limit of 12 when not specified", () => {
    // Force a broad match: "the" appears in many descriptions.
    const results = searchPages("the");
    expect(results.length).toBeLessThanOrEqual(12);
  });
});

describe("searchPages — preserves manifest order", () => {
  it("returns results in PAGES declaration order", () => {
    // Pick a query that matches multiple pages and verify the result
    // order matches the order those pages appear in PAGES.
    const q = "the";
    const results = searchPages(q);
    const slugs = results.map((p) => p.slug);
    const manifestOrder = PAGES.map((p) => p.slug).filter((slug) =>
      slugs.includes(slug),
    );
    expect(slugs).toEqual(manifestOrder);
  });
});

describe("PAGES manifest integrity", () => {
  it("every slug starts with /", () => {
    for (const p of PAGES) {
      expect(p.slug.startsWith("/")).toBe(true);
    }
  });

  it("no duplicate slugs", () => {
    const slugs = PAGES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every page has non-empty title and description", () => {
    for (const p of PAGES) {
      expect(p.title.trim().length).toBeGreaterThan(0);
      expect(p.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("excludes member/admin/auth/noindex routes", () => {
    const slugs = PAGES.map((p) => p.slug);
    // Sanity check — none of these private/noindex routes should leak in.
    expect(slugs).not.toContain("/account");
    expect(slugs).not.toContain("/signup");
    expect(slugs).not.toContain("/cart");
    expect(slugs).not.toContain("/order-confirmation");
    expect(slugs).not.toContain("/search");
    expect(slugs).not.toContain("/smoke");
    expect(slugs).not.toContain("/admin");
    expect(slugs).not.toContain("/winback");
    expect(slugs.filter((s) => s.startsWith("/theme-")).length).toBe(0);
  });
});
