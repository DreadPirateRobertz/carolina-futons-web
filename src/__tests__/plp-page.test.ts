// Tests for the PLP page searchParams parsing and PLPPagination URL builder.
// The page itself is a server component — tested via unit-level helpers extracted
// from the module rather than a full render.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Module-level stubs for server-side dependencies pulled in transitively
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/wix-client", () => ({ getWixClient: vi.fn() }));
vi.mock("@/lib/wix/products", () => ({
  getCollectionBySlug: vi.fn(),
  listProductsByCollectionId: vi.fn(),
  listProductsOnSale: vi.fn().mockResolvedValue([]),
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

import PlpPage, { parseSearchParams } from "@/app/shop/[category]/page";

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

  it("treats non-numeric priceMin/priceMax as undefined (no NaN leakage)", () => {
    const result = parseSearchParams({ priceMin: "abc", priceMax: "foo" });
    expect(result.priceMin).toBeUndefined();
    expect(result.priceMax).toBeUndefined();
  });

  it("accepts priceMin=0 as a valid lower bound", () => {
    expect(parseSearchParams({ priceMin: "0" }).priceMin).toBe(0);
  });
});

// ── PlpPage: virtual category (mattresses-sale) ────────────────────────────

import { getCollectionBySlug, listProductsOnSale } from "@/lib/wix/products";
import { getCollectionPlp } from "@/lib/wix/plp";
import { findCategory } from "@/lib/shop/categories";

const EMPTY_PLP = {
  page: { items: [], total: 0, page: 1, pageSize: 24, hasNext: false, hasPrev: false },
  facets: { total: 0, inStock: 0, outOfStock: 0, priceBuckets: [] },
};

describe("PlpPage — mattresses-sale virtual category", () => {
  beforeEach(() => {
    vi.mocked(findCategory).mockReturnValue({
      slug: "mattresses-sale",
      name: "Mattresses on Sale",
      description: "Current promotions.",
      collectionSlug: "mattresses-sale",
    });
    // mattresses-sale has no Wix collection; "mattresses" does
    vi.mocked(getCollectionBySlug).mockImplementation(async (slug: string) =>
      slug === "mattresses" ? ({ _id: "mattresses-col-id" } as never) : null,
    );
    // listProductsOnSale fetches from the mattresses collection
    vi.mocked(listProductsOnSale).mockResolvedValue([
      { _id: "m1", name: "Sale Mattress" } as never,
    ]);
    vi.mocked(getCollectionPlp).mockResolvedValue(EMPTY_PLP);
  });

  it("calls getCollectionPlp with prefetchedProducts even when collection is null", async () => {
    await PlpPage({
      params: Promise.resolve({ category: "mattresses-sale" }),
      searchParams: Promise.resolve({}),
    });
    expect(getCollectionPlp).toHaveBeenCalledWith(
      "",
      expect.objectContaining({
        prefetchedProducts: [{ _id: "m1", name: "Sale Mattress" }],
      }),
    );
  });
});
