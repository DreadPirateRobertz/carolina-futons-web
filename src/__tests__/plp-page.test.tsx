// Tests for the PLP page searchParams parsing and PLPPagination URL builder.
// The page itself is a server component — tested via unit-level helpers extracted
// from the module rather than a full render.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Module-level stubs for server-side dependencies pulled in transitively
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
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
vi.mock("@/lib/shop/plp-observability", () => ({
  logOverPaginatedRender: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));
// cf-delight: PLP page renders ShopTheRoom for slugs in
// PLP_SHOP_THE_ROOM_CONFIGS. Stub the section to skip the async
// product-fetch path (which would suspend renderToStaticMarkup) and
// stub the lookup map empty so the standard tests don't accidentally
// emit the section. The dedicated gating describe block below
// re-mocks per test to flip the map and assert the conditional.
vi.mock("@/components/site/ShopTheRoom", () => ({
  ShopTheRoom: () => null,
  PLP_SHOP_THE_ROOM_CONFIGS: {},
}));
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: vi.fn(async (_k: string, fallback: string = "") => fallback),
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
    // Region-scope: extract only the over-paginated <p> block so we don't
    // accidentally assert against PLPControls sort links elsewhere on the page.
    // The back-to-page-1 <p> always starts with "No more products on page".
    const overPaginatedBlock =
      html.match(/<p[^>]*>\s*No more products[\s\S]*?<\/p>/)?.[0] ?? "";
    expect(overPaginatedBlock).not.toBe("");
    expect(overPaginatedBlock).toMatch(/sort=price-asc/);
    expect(overPaginatedBlock).toMatch(/priceMin=200/);
    expect(overPaginatedBlock).toMatch(/inStock=1/);
    // Back-to-page-1 link MUST NOT carry a page param
    expect(overPaginatedBlock).not.toMatch(/page=/);
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

// ── PlpPage: F2 resolver wiring (non-filter bypass + sale empty-state) ─────

describe("PlpPage — non-filter categories skip listProductsOnSale (F2 wiring)", () => {
  beforeEach(() => {
    vi.mocked(listProductsOnSale).mockClear();
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
    vi.mocked(getCollectionPlp).mockResolvedValue(EMPTY_PLP);
  });

  it("does not invoke the on-sale filter for a regular collection category", async () => {
    await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({}),
    });
    expect(listProductsOnSale).not.toHaveBeenCalled();
  });
});

describe("PlpPage — mattresses-sale empty result surfaces per-category copy", () => {
  beforeEach(() => {
    vi.mocked(findCategory).mockReturnValue({
      slug: "mattresses-sale",
      name: "Mattresses on Sale",
      description: "Current promotions.",
      collectionSlug: "mattresses-sale",
      sourceSlug: "mattresses",
      filter: "on-sale",
      emptyStateCopy: "No mattresses are on sale right now. Check back soon.",
    });
    vi.mocked(getCollectionBySlug).mockImplementation(async (slug: string) =>
      slug === "mattresses" ? ({ _id: "mattresses-col-id" } as never) : null,
    );
    vi.mocked(listProductsOnSale).mockResolvedValue([]);
    vi.mocked(getCollectionPlp).mockResolvedValue(EMPTY_PLP);
  });

  it("renders the category's emptyStateCopy when no mattresses are discounted", async () => {
    const tree = (await PlpPage({
      params: Promise.resolve({ category: "mattresses-sale" }),
      searchParams: Promise.resolve({}),
    })) as ReactElement;
    const html = renderToStaticMarkup(tree);

    expect(html).toContain(
      "No mattresses are on sale right now. Check back soon.",
    );
    expect(html).not.toMatch(/No products found in this collection/);
  });
});

// ── PlpPage: observability — logOverPaginatedRender emission (cf-3qt.6.B.3) ─

import { logOverPaginatedRender } from "@/lib/shop/plp-observability";

describe("PlpPage — logOverPaginatedRender emission", () => {
  beforeEach(() => {
    vi.mocked(logOverPaginatedRender).mockClear();
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

  it("fires on over-paginated render with full context", async () => {
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

    await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({ page: "2" }),
    });

    expect(logOverPaginatedRender).toHaveBeenCalledTimes(1);
    expect(logOverPaginatedRender).toHaveBeenCalledWith({
      categorySlug: "futon-frames",
      pageNum: 2,
      pageTotal: 6,
      pageSize: 24,
    });
  });

  it("does NOT fire on page 1 empty collection", async () => {
    vi.mocked(getCollectionPlp).mockResolvedValue(EMPTY_PLP);

    await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({}),
    });

    expect(logOverPaginatedRender).not.toHaveBeenCalled();
  });

  it("does NOT fire when filters eliminated everything (page.total=0)", async () => {
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

    await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({ page: "2", priceMin: "99999" }),
    });

    expect(logOverPaginatedRender).not.toHaveBeenCalled();
  });

  it("does NOT fire on reader outage — outage guard (melania ruling on PR #54)", async () => {
    // Product decision: when the reader errors, overPaginated may still be
    // true structurally, but the log is suppressed so outage-induced
    // "over-pagination" doesn't pollute the metric. Outage events ship
    // their own telemetry via logWixFailure in the reader layer.
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

    await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({ page: "2" }),
    });

    expect(logOverPaginatedRender).not.toHaveBeenCalled();
  });
});

// ── plp-observability: logOverPaginatedRender helper unit tests ────────────

describe("logOverPaginatedRender helper", () => {
  // The file-top mock replaces the helper with vi.fn() for PlpPage emission
  // tests. These tests need the real impl, so they bypass the mock via
  // vi.importActual. getRealHelperAndSpy wraps that dance so each case
  // stays under 10 lines.
  async function getRealHelperAndSpy() {
    const actual = await vi.importActual<
      typeof import("@/lib/shop/plp-observability")
    >("@/lib/shop/plp-observability");
    const sentry = await import("@sentry/nextjs");
    const captureSpy = vi.mocked(sentry.captureMessage);
    captureSpy.mockClear();
    return { logOverPaginatedRender: actual.logOverPaginatedRender, captureSpy };
  }

  it("computes lastPage from pageTotal / pageSize (ceiling)", async () => {
    const { logOverPaginatedRender, captureSpy } = await getRealHelperAndSpy();
    logOverPaginatedRender({
      categorySlug: "futon-frames",
      pageNum: 5,
      pageTotal: 6,
      pageSize: 24,
    });

    expect(captureSpy).toHaveBeenCalledTimes(1);
    const [msg, rawOpts] = captureSpy.mock.calls[0]!;
    // Sentry.captureMessage's second arg is SeverityLevel | CaptureContext;
    // our helper always passes an object, so narrow for the assertions.
    const opts = rawOpts as {
      level?: string;
      tags?: Record<string, unknown>;
      extra?: Record<string, unknown>;
    };
    expect(msg).toBe("plp-page over-paginated render");
    expect(opts.level).toBe("info");
    expect(opts.tags).toMatchObject({
      source: "plp-page",
      op: "over-paginated",
      categorySlug: "futon-frames",
    });
    expect(opts.extra).toMatchObject({
      categorySlug: "futon-frames",
      pageNum: 5,
      pageTotal: 6,
      pageSize: 24,
      lastPage: 1, // ceil(6/24) = 1
    });
  });

  it("lastPage is ceiled (pageTotal=25, pageSize=24 → lastPage=2)", async () => {
    const { logOverPaginatedRender, captureSpy } = await getRealHelperAndSpy();
    logOverPaginatedRender({
      categorySlug: "sofa-beds",
      pageNum: 10,
      pageTotal: 25,
      pageSize: 24,
    });

    const [, rawOpts] = captureSpy.mock.calls[0]!;
    const opts = rawOpts as { extra?: { lastPage: number } };
    expect(opts.extra?.lastPage).toBe(2);
  });

  it("lastPage floors to 1 when pageTotal=0 (no divide-by-zero, no 0-page)", async () => {
    const { logOverPaginatedRender, captureSpy } = await getRealHelperAndSpy();
    logOverPaginatedRender({
      categorySlug: "empty",
      pageNum: 2,
      pageTotal: 0,
      pageSize: 24,
    });

    const [, rawOpts] = captureSpy.mock.calls[0]!;
    const opts = rawOpts as { extra?: { lastPage: number } };
    expect(opts.extra?.lastPage).toBe(1);
  });
});

// ── PlpPage: product card stagger reveal (cf-plp-card-stagger) ─────────────

describe("PlpPage — product card stagger (cf-plp-card-stagger)", () => {
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
    vi.mocked(getCollectionPlp).mockResolvedValue({
      page: {
        items: [
          {
            _id: "p1",
            name: "Oak Loft Futon",
            slug: "oak-loft",
            priceData: { formatted: { price: "$499" } },
          },
          {
            _id: "p2",
            name: "Maple Daybed",
            slug: "maple-daybed",
            priceData: { formatted: { price: "$699" } },
          },
          {
            _id: "p3",
            name: "Cherry Platform",
            slug: "cherry-platform",
            priceData: { formatted: { price: "$899" } },
          },
        ],
        total: 3,
        page: 1,
        pageSize: 24,
        hasNext: false,
        hasPrev: false,
      },
      facets: { total: 3, inStock: 3, outOfStock: 0, priceBuckets: [] },
    } as never);
  });

  it("renders one product card per item in the page result", async () => {
    const tree = (await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({}),
    })) as ReactElement;
    const html = renderToStaticMarkup(tree);

    // Every product.name appears in the rendered HTML exactly once within
    // the grid (ProductCard renders it as the h2 label).
    expect(html).toContain("Oak Loft Futon");
    expect(html).toContain("Maple Daybed");
    expect(html).toContain("Cherry Platform");
    // And the PDP link is built from the slug
    expect(html).toMatch(/href="\/products\/oak-loft"/);
    expect(html).toMatch(/href="\/products\/maple-daybed"/);
    expect(html).toMatch(/href="\/products\/cherry-platform"/);
  });

  it("wraps each ProductCard in a HeroReveal <li data-slot='hero-reveal'> for index-based stagger", async () => {
    const tree = (await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({}),
    })) as ReactElement;
    const html = renderToStaticMarkup(tree);

    // One hero-reveal wrapper per product card — 3 products in the fixture.
    const revealMatches = html.match(/data-slot="hero-reveal"/g) ?? [];
    expect(revealMatches.length).toBe(3);

    // Wrappers are <li> so the <ul> list semantics stay valid, and each
    // wrapper contains exactly one product-card.
    expect(html).toMatch(/<li[^>]*data-slot="hero-reveal"/);
    const cardMatches = html.match(/data-slot="product-card"/g) ?? [];
    expect(cardMatches.length).toBe(3);
  });
});

// ── PlpPage: cf-delight ShopTheRoom gating ─────────────────────────────────
//
// PlpPage reads `PLP_SHOP_THE_ROOM_CONFIGS[categorySlug]` and only
// renders the section when the lookup returns a config. These tests
// pin the gating contract:
//   - configured slug (futon-frames) → section renders + receives the
//     right props (catches a future swap that points the PLP at the
//     wrong photo or heading)
//   - unconfigured slug (mattresses, mattresses-sale) → section absent
//
// We swap only the @/components/site/ShopTheRoom mock per test so the
// other six mocks at the top of the file stay in force; only `categories`
// + `ShopTheRoom` need to vary between the gating cases. Spy fn captures
// the props passed at the call site so a future copy/paste regression
// (wrong heroPhoto / headingId) fails this test.

describe("PlpPage — cf-delight ShopTheRoom gating", () => {
  type SectionProps = {
    headingId: string;
    eyebrow: string;
    heading: string;
    heroPhoto: { src: string };
    hotspotConfigs: Array<{ id: string }>;
  };

  const FUTON_CONFIG: SectionProps = {
    headingId: "plp-futon-frames-shop-the-room-heading",
    eyebrow: "Shop the room",
    heading: "See the futons in a room",
    heroPhoto: { src: "stub-futon-frames" },
    hotspotConfigs: [{ id: "monterey-plp" }],
  };

  async function renderForCategory(
    slug: string,
    configMap: Record<string, SectionProps> = { "futon-frames": FUTON_CONFIG },
  ): Promise<{ html: string; spyCalls: SectionProps[] }> {
    vi.resetModules();
    const spyCalls: SectionProps[] = [];
    vi.doMock("@/lib/shop/categories", () => ({
      SHOP_CATEGORIES: [
        { slug, name: "X", description: "", collectionSlug: slug },
      ],
      findCategory: (s: string) =>
        s === slug
          ? { slug, name: "X", description: "", collectionSlug: slug }
          : undefined,
    }));
    vi.doMock("@/components/site/ShopTheRoom", () => ({
      ShopTheRoom: (props: SectionProps) => {
        spyCalls.push(props);
        return (
          <div data-slot="cf-delight-shop-the-room" data-heading-id={props.headingId} />
        );
      },
      PLP_SHOP_THE_ROOM_CONFIGS: configMap,
    }));
    const Page = (await import("@/app/shop/[category]/page")).default;
    const tree = (await Page({
      params: Promise.resolve({ category: slug }),
      searchParams: Promise.resolve({}),
    })) as ReactElement;
    return { html: renderToStaticMarkup(tree), spyCalls };
  }

  it("renders ShopTheRoom on /shop/futon-frames with the futon-frames PLP config", async () => {
    const { html, spyCalls } = await renderForCategory("futon-frames");
    expect(html).toContain('data-slot="cf-delight-shop-the-room"');
    expect(spyCalls).toHaveLength(1);
    expect(spyCalls[0]!.headingId).toBe(
      "plp-futon-frames-shop-the-room-heading",
    );
    expect(spyCalls[0]!.heading).toMatch(/see the futons/i);
    expect(spyCalls[0]!.heroPhoto.src).toBe("stub-futon-frames");
  });

  it("does NOT render ShopTheRoom on /shop/mattresses (other PLPs unchanged)", async () => {
    const { html, spyCalls } = await renderForCategory("mattresses");
    expect(html).not.toContain('data-slot="cf-delight-shop-the-room"');
    expect(spyCalls).toHaveLength(0);
  });

  it("does NOT render ShopTheRoom on /shop/mattresses-sale (virtual category)", async () => {
    const { html, spyCalls } = await renderForCategory("mattresses-sale");
    expect(html).not.toContain('data-slot="cf-delight-shop-the-room"');
    expect(spyCalls).toHaveLength(0);
  });

  it("renders ShopTheRoom AFTER the product grid + pagination, not above the H1", async () => {
    const { html } = await renderForCategory("futon-frames");
    const ulIdx = html.indexOf("<ul");
    const sectionIdx = html.indexOf('data-slot="cf-delight-shop-the-room"');
    const h1Idx = html.indexOf("<h1");
    expect(h1Idx).toBeGreaterThan(-1);
    expect(ulIdx).toBeGreaterThan(-1);
    expect(sectionIdx).toBeGreaterThan(-1);
    expect(sectionIdx).toBeGreaterThan(ulIdx);
    expect(sectionIdx).toBeGreaterThan(h1Idx);
  });

  it("does NOT render ShopTheRoom when the lookup map is empty (regression guard)", async () => {
    const { html, spyCalls } = await renderForCategory("futon-frames", {});
    expect(html).not.toContain('data-slot="cf-delight-shop-the-room"');
    expect(spyCalls).toHaveLength(0);
  });
});
