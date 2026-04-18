// Tests for the PLP page searchParams parsing and PLPPagination URL builder.
// The page itself is a server component — tested via unit-level helpers extracted
// from the module rather than a full render.

import { describe, it, expect, vi } from "vitest";

// Module-level stubs for server-side dependencies pulled in transitively
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/wix-client", () => ({ getWixClient: vi.fn() }));
vi.mock("@/lib/wix/products", () => ({
  getCollectionBySlug: vi.fn(),
  listProductsByCollectionId: vi.fn(),
}));
vi.mock("@/lib/wix/plp", () => ({
  getCollectionPlp: vi.fn(),
}));
vi.mock("@/lib/shop/categories", () => ({
  SHOP_CATEGORIES: [],
  findCategory: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));
import { buildPageUrl } from "@/components/plp/PLPPagination";

// ── PLPPagination.buildPageUrl ──────────────────────────────────────────────

describe("PLPPagination buildPageUrl", () => {
  const base = "/shop/futon-frames";

  it("page 1 → omits page param", () => {
    const url = buildPageUrl(base, {}, 1);
    expect(url).toBe(base);
  });

  it("page 2 → includes page=2", () => {
    const url = buildPageUrl(base, {}, 2);
    expect(url).toBe(`${base}?page=2`);
  });

  it("preserves existing sort param", () => {
    const url = buildPageUrl(base, { sort: "price-asc" }, 2);
    expect(url).toContain("sort=price-asc");
    expect(url).toContain("page=2");
  });

  it("strips existing page param before inserting new one", () => {
    const url = buildPageUrl(base, { page: "3", sort: "newest" }, 4);
    expect(url).toContain("page=4");
    expect((url.match(/page=/g) ?? []).length).toBe(1);
  });

  it("preserves priceMin, priceMax, inStock filter params", () => {
    const url = buildPageUrl(
      base,
      { priceMin: "200", priceMax: "1000", inStock: "1" },
      2,
    );
    expect(url).toContain("priceMin=200");
    expect(url).toContain("priceMax=1000");
    expect(url).toContain("inStock=1");
    expect(url).toContain("page=2");
  });

  it("handles array-valued searchParams by using first value", () => {
    const url = buildPageUrl(base, { sort: ["price-asc", "newest"] }, 1);
    expect(url).toContain("sort=price-asc");
    expect(url).not.toContain("newest");
  });
});

// ── parseSearchParams (re-exported for test access) ────────────────────────

import { parseSearchParams } from "@/app/shop/[category]/page";

describe("parseSearchParams", () => {
  it("defaults: page=1, sort=featured, no filters", () => {
    const result = parseSearchParams({});
    expect(result).toEqual({
      pageNum: 1,
      sort: "featured",
      priceMin: undefined,
      priceMax: undefined,
      inStockOnly: false,
    });
  });

  it("parses page number", () => {
    expect(parseSearchParams({ page: "3" }).pageNum).toBe(3);
  });

  it("clamps invalid page to 1", () => {
    expect(parseSearchParams({ page: "0" }).pageNum).toBe(1);
    expect(parseSearchParams({ page: "abc" }).pageNum).toBe(1);
  });

  it("parses valid sort", () => {
    expect(parseSearchParams({ sort: "price-desc" }).sort).toBe("price-desc");
  });

  it("falls back to featured for unknown sort", () => {
    expect(parseSearchParams({ sort: "hacked" }).sort).toBe("featured");
  });

  it("parses priceMin and priceMax", () => {
    const { priceMin, priceMax } = parseSearchParams({
      priceMin: "200",
      priceMax: "800",
    });
    expect(priceMin).toBe(200);
    expect(priceMax).toBe(800);
  });

  it("parses inStock flag", () => {
    expect(parseSearchParams({ inStock: "1" }).inStockOnly).toBe(true);
    expect(parseSearchParams({ inStock: "0" }).inStockOnly).toBe(false);
    expect(parseSearchParams({}).inStockOnly).toBe(false);
  });

  it("handles array-valued page param by using first value", () => {
    expect(parseSearchParams({ page: ["5", "6"] }).pageNum).toBe(5);
  });
});
