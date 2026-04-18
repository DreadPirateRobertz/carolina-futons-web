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
    // cf-3qt.6.D.F3: mattresses-sale is a config-driven derived category
    // (filter: "on-sale" + sourceSlug: "mattresses").
    vi.mocked(findCategory).mockReturnValue({
      slug: "mattresses-sale",
      name: "Mattresses on Sale",
      description: "Current promotions.",
      collectionSlug: "mattresses-sale",
      sourceSlug: "mattresses",
      filter: "on-sale",
      emptyStateCopy: "No mattresses on sale.",
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

// ── PlpPage: reader-error outage branch (cf-3qt.6.B silent-failure fix) ────

import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";

describe("PlpPage — reader outage (error from getCollectionPlp)", () => {
  beforeEach(() => {
    vi.mocked(findCategory).mockReturnValue({
      slug: "futon-frames",
      name: "Futon Frames",
      description: "Our frames.",
      collectionSlug: "futon-frames",
    });
    vi.mocked(getCollectionBySlug).mockResolvedValue({
      _id: "futons-col-id",
    } as never);
    vi.mocked(listProductsOnSale).mockResolvedValue([]);
  });

  it("renders the outage copy (role=alert) when reader returns error", async () => {
    vi.mocked(getCollectionPlp).mockResolvedValue({
      ...EMPTY_PLP,
      page: { ...EMPTY_PLP.page, error: "wix_sdk" },
      error: "wix_sdk",
    } as never);

    const tree = (await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({}),
    })) as ReactElement;
    const html = renderToStaticMarkup(tree);

    expect(html).toContain('role="alert"');
    expect(html).toMatch(/having trouble loading products/i);
    expect(html).not.toMatch(/No products found in this collection/);
  });

  it("renders the normal empty-state copy when reader returns no error", async () => {
    vi.mocked(getCollectionPlp).mockResolvedValue(EMPTY_PLP);

    const tree = (await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({}),
    })) as ReactElement;
    const html = renderToStaticMarkup(tree);

    expect(html).not.toContain('role="alert"');
    expect(html).toContain("No products found in this collection");
  });

  it("propagates both 'wix_sdk' and 'unexpected' error tags to outage copy", async () => {
    for (const tag of ["wix_sdk", "unexpected"] as const) {
      vi.mocked(getCollectionPlp).mockResolvedValue({
        ...EMPTY_PLP,
        page: { ...EMPTY_PLP.page, error: tag },
        error: tag,
      } as never);
      const tree = (await PlpPage({
        params: Promise.resolve({ category: "futon-frames" }),
        searchParams: Promise.resolve({}),
      })) as ReactElement;
      const html = renderToStaticMarkup(tree);
      expect(html, `error tag ${tag}`).toContain('role="alert"');
    }
  });
});

// ── PlpPage: over-paginated branch (cf-3qt.6.B.1) ──────────────────────────

describe("PlpPage — over-paginated (page beyond last filled page)", () => {
  beforeEach(() => {
    vi.mocked(findCategory).mockReturnValue({
      slug: "futon-frames",
      name: "Futon Frames",
      description: "Our frames.",
      collectionSlug: "futon-frames",
    });
    vi.mocked(getCollectionBySlug).mockResolvedValue({
      _id: "futons-col-id",
    } as never);
    vi.mocked(listProductsOnSale).mockResolvedValue([]);
  });

  it("renders back-to-page-1 link when pageNum>1 and page.total>0 but items=[]", async () => {
    vi.mocked(getCollectionPlp).mockResolvedValue({
      page: {
        items: [],
        total: 6,
        page: 2,
        pageSize: 24,
        hasNext: false,
        hasPrev: true,
      },
      facets: { total: 6, inStock: 6, outOfStock: 0, priceBuckets: [] },
    });

    const tree = (await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({ page: "2" }),
    })) as ReactElement;
    const html = renderToStaticMarkup(tree);

    expect(html).toMatch(/No more products on page 2/);
    expect(html).toMatch(/href="\/shop\/futon-frames"/);
    expect(html).toContain("Back to page 1");
    expect(html).not.toMatch(/No products found in this collection/);
    expect(html).not.toMatch(/No products match these filters/);
  });

  it("preserves sort + filter params in back-to-page-1 link", async () => {
    vi.mocked(getCollectionPlp).mockResolvedValue({
      page: {
        items: [],
        total: 3,
        page: 5,
        pageSize: 24,
        hasNext: false,
        hasPrev: true,
      },
      facets: { total: 6, inStock: 3, outOfStock: 3, priceBuckets: [] },
    });

    const tree = (await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({
        page: "5",
        sort: "price-asc",
        priceMin: "200",
        inStock: "1",
      }),
    })) as ReactElement;
    const html = renderToStaticMarkup(tree);

    expect(html).toMatch(/No more products on page 5/);
    expect(html).toMatch(/sort=price-asc/);
    expect(html).toMatch(/priceMin=200/);
    expect(html).toMatch(/inStock=1/);
    // Back-to-page-1 link MUST NOT carry a page param
    const hrefs = html.match(/href="([^"]+)"/g) ?? [];
    const backHref = hrefs.find((h) => h.includes("sort=price-asc"));
    expect(backHref).toBeDefined();
    expect(backHref).not.toMatch(/page=/);
  });

  it("does NOT trigger over-paginated branch on page 1 with empty collection", async () => {
    vi.mocked(getCollectionPlp).mockResolvedValue(EMPTY_PLP);

    const tree = (await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({}),
    })) as ReactElement;
    const html = renderToStaticMarkup(tree);

    expect(html).not.toMatch(/Back to page 1/);
    expect(html).toMatch(/No products found in this collection/);
  });

  it("does NOT trigger over-paginated branch when filters eliminated everything (page.total=0)", async () => {
    vi.mocked(getCollectionPlp).mockResolvedValue({
      page: {
        items: [],
        total: 0,
        page: 2,
        pageSize: 24,
        hasNext: false,
        hasPrev: false,
      },
      facets: { total: 10, inStock: 5, outOfStock: 5, priceBuckets: [] },
    });

    const tree = (await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({ page: "2", priceMin: "99999" }),
    })) as ReactElement;
    const html = renderToStaticMarkup(tree);

    expect(html).not.toMatch(/Back to page 1/);
    expect(html).toMatch(/No products match these filters/);
  });

  it("outage error takes precedence over over-paginated branch", async () => {
    vi.mocked(getCollectionPlp).mockResolvedValue({
      page: {
        items: [],
        total: 6,
        page: 2,
        pageSize: 24,
        hasNext: false,
        hasPrev: true,
        error: "wix_sdk",
      },
      facets: { total: 6, inStock: 6, outOfStock: 0, priceBuckets: [] },
      error: "wix_sdk",
    } as never);

    const tree = (await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({ page: "2" }),
    })) as ReactElement;
    const html = renderToStaticMarkup(tree);

    expect(html).toContain('role="alert"');
    expect(html).not.toMatch(/Back to page 1/);
  });
});
