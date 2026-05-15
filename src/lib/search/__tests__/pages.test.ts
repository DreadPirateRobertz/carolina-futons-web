// cf-76a (cf-ruhm.1): unit tests for the static Pages search manifest.
// Drives `searchPages` across happy-path, empty inputs, case insensitivity,
// keyword matches, description matches, limit slicing, and manifest
// integrity (no duplicate slugs, every slug starts with `/`).

import { describe, it, expect } from "vitest";

import { searchPages, PAGES } from "@/lib/search/pages";

describe("searchPages — happy path", () => {
  it("matches title substring (case-insensitive)", () => {
    const { items: results } = searchPages("futon");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((p) => p.slug === "/futon-sommelier")).toBe(true);
  });

  it("matches description substring", () => {
    const { items: results } = searchPages("hendersonville");
    // Both /about and /faq mention hendersonville
    expect(results.some((p) => p.slug === "/about")).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("matches keyword substring", () => {
    // /accessibility lists 'wcag' as a keyword
    const { items: results } = searchPages("wcag");
    expect(results.map((p) => p.slug)).toEqual(["/accessibility"]);
  });

  it("matches case-insensitively across all fields", () => {
    const lower = searchPages("warranty").items;
    const upper = searchPages("WARRANTY").items;
    const mixed = searchPages("WaRrAnTy").items;
    expect(lower.map((p) => p.slug).sort()).toEqual(
      upper.map((p) => p.slug).sort(),
    );
    expect(lower.map((p) => p.slug).sort()).toEqual(
      mixed.map((p) => p.slug).sort(),
    );
  });
});

describe("searchPages — empty / whitespace q", () => {
  it("returns { items: [], total: 0 } for empty string", () => {
    expect(searchPages("")).toEqual({ items: [], total: 0 });
  });

  it("returns { items: [], total: 0 } for whitespace-only q", () => {
    expect(searchPages("   ")).toEqual({ items: [], total: 0 });
  });

  it("returns { items: [], total: 0 } for q with no matches", () => {
    expect(searchPages("zzzzzz-no-such-term")).toEqual({ items: [], total: 0 });
  });
});

describe("searchPages — pagination (cf-94l)", () => {
  it("respects the pageSize parameter (slices AFTER filtering)", () => {
    // "a" appears in many manifest entries; limit it.
    const { items, total } = searchPages("a", { pageSize: 3 });
    expect(items.length).toBeLessThanOrEqual(3);
    expect(total).toBeGreaterThanOrEqual(items.length);
  });

  it("uses default pageSize of 12 when not specified", () => {
    // Force a broad match: "the" appears in many descriptions.
    const { items } = searchPages("the");
    expect(items.length).toBeLessThanOrEqual(12);
  });

  it("returns the second page when page=2", () => {
    // Get all matches for a broad query so pagination is meaningful.
    const all = searchPages("a", { pageSize: 100 }).items;
    const pageSize = 3;
    const page1 = searchPages("a", { page: 1, pageSize }).items;
    const page2 = searchPages("a", { page: 2, pageSize }).items;
    expect(page1.length).toBe(Math.min(pageSize, all.length));
    expect(page2.length).toBe(
      Math.min(pageSize, Math.max(0, all.length - pageSize)),
    );
    // Page 1 and page 2 must not overlap.
    const overlap = page1.filter((p) =>
      page2.some((q) => q.slug === p.slug),
    );
    expect(overlap).toEqual([]);
  });

  it("over-pagination returns empty items but full total", () => {
    const { items, total } = searchPages("warranty", { page: 999 });
    expect(items).toEqual([]);
    expect(total).toBeGreaterThan(0);
  });

  it("clamps non-positive page numbers to page 1", () => {
    const page0 = searchPages("warranty", { page: 0 }).items;
    const pageNeg = searchPages("warranty", { page: -5 }).items;
    const page1 = searchPages("warranty", { page: 1 }).items;
    expect(page0).toEqual(page1);
    expect(pageNeg).toEqual(page1);
  });
});

describe("searchPages — preserves manifest order", () => {
  it("returns results in PAGES declaration order", () => {
    // Pick a query that matches multiple pages and verify the result
    // order matches the order those pages appear in PAGES.
    const q = "the";
    const { items: results } = searchPages(q);
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
