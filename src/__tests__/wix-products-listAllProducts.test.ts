import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// cfw-upa: paginate-to-completion contract for listAllProducts.
//
// Wix queryProducts() caps .limit() at 100 per call. Anything that needs
// the full catalog (sitemap, search) must paginate. We exercise the
// helper with a 250-item fake catalog split across three Wix-style pages
// and assert: every page is consumed, the SDK never sees a limit > 100,
// and the configurable cap actually clips the final result.

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));

type FakeProduct = { _id: string; slug: string };
type Page = { items: FakeProduct[]; hasNext: () => boolean; next: () => Promise<Page> };

function buildPagedClient(allItems: FakeProduct[], pageSize: number) {
  const limitSpy = vi.fn();
  function pageAt(offset: number): Page {
    const items = allItems.slice(offset, offset + pageSize);
    return {
      items,
      hasNext: () => offset + pageSize < allItems.length,
      next: () => Promise.resolve(pageAt(offset + pageSize)),
    };
  }
  const client = {
    products: {
      queryProducts: () => ({
        limit: (n: number) => {
          limitSpy(n);
          return { find: () => Promise.resolve(pageAt(0)) };
        },
      }),
    },
  };
  return { client, limitSpy };
}

const ORIGINAL_USE_FIXTURES = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS;

beforeEach(() => {
  // Force the SDK path; fixtures path is exercised by other tests.
  delete process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS;
  vi.resetModules();
});

afterEach(() => {
  if (ORIGINAL_USE_FIXTURES === undefined) {
    delete process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS;
  } else {
    process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS = ORIGINAL_USE_FIXTURES;
  }
  vi.restoreAllMocks();
});

describe("listAllProducts — pagination", () => {
  it("walks every Wix page and returns the full catalog when under the cap", async () => {
    const all: FakeProduct[] = Array.from({ length: 250 }, (_, i) => ({
      _id: `p${i}`,
      slug: `sku-${i}`,
    }));
    const { client, limitSpy } = buildPagedClient(all, 100);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listAllProducts } = await import("@/lib/wix/products");
    const result = await listAllProducts(1000);

    expect(result).toHaveLength(250);
    expect(result[0]).toEqual({ _id: "p0", slug: "sku-0" });
    expect(result[249]).toEqual({ _id: "p249", slug: "sku-249" });
    // First call must use limit ≤ 100 — anything more failed SDK validation
    // and was the original cfw-upa bug.
    expect(limitSpy).toHaveBeenCalledWith(100);
  });

  it("stops paginating once the configured cap is reached", async () => {
    const all: FakeProduct[] = Array.from({ length: 250 }, (_, i) => ({
      _id: `p${i}`,
      slug: `sku-${i}`,
    }));
    const { client } = buildPagedClient(all, 100);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listAllProducts } = await import("@/lib/wix/products");
    const result = await listAllProducts(120);

    // Cap clips below the natural pagination boundary.
    expect(result).toHaveLength(120);
    expect(result[0]?._id).toBe("p0");
    expect(result[119]?._id).toBe("p119");
  });

  it("returns the partial page when the catalog is smaller than one page", async () => {
    const all: FakeProduct[] = Array.from({ length: 30 }, (_, i) => ({
      _id: `p${i}`,
      slug: `sku-${i}`,
    }));
    const { client } = buildPagedClient(all, 100);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listAllProducts } = await import("@/lib/wix/products");
    const result = await listAllProducts();

    expect(result).toHaveLength(30);
  });

  it("returns [] and does not throw when the SDK errors", async () => {
    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => ({
        products: {
          queryProducts: () => ({
            limit: () => ({
              find: () => Promise.reject(new Error("Wix exploded")),
            }),
          }),
        },
      }),
    }));

    const { listAllProducts } = await import("@/lib/wix/products");
    const result = await listAllProducts();
    expect(result).toEqual([]);
  });
});
