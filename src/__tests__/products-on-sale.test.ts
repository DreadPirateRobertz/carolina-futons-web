import { describe, it, expect, vi, beforeEach } from "vitest";

const sentryMock = vi.hoisted(() => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));

vi.mock("@sentry/nextjs", () => sentryMock);

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

type MockProduct = {
  _id: string;
  priceData?: { price?: number; discountedPrice?: number };
};

function makePage(items: MockProduct[], hasMore = false) {
  return {
    items,
    hasNext: () => hasMore,
    next: vi.fn(),
  };
}

function makeClient(pages: MockProduct[][]) {
  const pageObjects = pages.map((items, i) => ({
    items,
    hasNext: () => i < pages.length - 1,
    next: vi.fn(),
  }));
  for (let i = 0; i < pageObjects.length - 1; i++) {
    pageObjects[i].next.mockResolvedValue(pageObjects[i + 1]);
  }
  return {
    products: {
      queryProducts: () => ({
        hasSome: () => ({
          limit: () => ({
            find: async () => pageObjects[0],
          }),
        }),
      }),
    },
  };
}

const onSale = (id: string) => ({
  _id: id,
  priceData: { price: 1000, discountedPrice: 799 },
});
const notOnSale = (id: string) => ({
  _id: id,
  priceData: { price: 1000, discountedPrice: 1000 },
});

describe("listProductsOnSale — pagination", () => {
  it("returns on-sale products from a single page", async () => {
    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => makeClient([[onSale("a"), notOnSale("b"), onSale("c")]]),
    }));

    const { listProductsOnSale } = await import("@/lib/wix/products");
    const result = await listProductsOnSale("col-1");

    expect(result.map((p) => p._id)).toEqual(["a", "c"]);
  });

  it("paginates across multiple pages and returns all on-sale products", async () => {
    const page1 = [onSale("p1"), notOnSale("p2")];
    const page2 = [notOnSale("p3"), onSale("p4")];
    const page3 = [onSale("p5")];

    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => makeClient([page1, page2, page3]),
    }));

    const { listProductsOnSale } = await import("@/lib/wix/products");
    const result = await listProductsOnSale("col-1");

    expect(result.map((p) => p._id)).toEqual(["p1", "p4", "p5"]);
  });

  it("returns [] and logs Sentry on SDK error", async () => {
    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => ({
        products: {
          queryProducts: () => ({
            hasSome: () => ({
              limit: () => ({
                find: async () => {
                  throw new Error("wix down");
                },
              }),
            }),
          }),
        },
      }),
    }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { listProductsOnSale } = await import("@/lib/wix/products");
    const result = await listProductsOnSale("col-1");

    expect(result).toEqual([]);
    expect(sentryMock.captureException).toHaveBeenCalledOnce();
  });

  it("fires a Sentry warning (not exception) when scan ceiling is hit and more products exist", async () => {
    // Build enough pages to trigger the SALE_SCAN_LIMIT=500 ceiling.
    // 5 pages × 100 items = 500 items; 6th page still hasNext=true → ceiling triggers.
    const hundredOnSale = Array.from({ length: 100 }, (_, i) => onSale(`p${i}`));
    const pages: MockProduct[][] = Array.from({ length: 6 }, () => hundredOnSale);

    const pageObjects = pages.map((items, i) => ({
      items,
      hasNext: () => i < pages.length - 1,
      next: vi.fn(),
    }));
    for (let i = 0; i < pageObjects.length - 1; i++) {
      pageObjects[i].next.mockResolvedValue(pageObjects[i + 1]);
    }

    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => ({
        products: {
          queryProducts: () => ({
            hasSome: () => ({
              limit: () => ({
                find: async () => pageObjects[0],
              }),
            }),
          }),
        },
      }),
    }));

    const { listProductsOnSale } = await import("@/lib/wix/products");
    const result = await listProductsOnSale("col-1");

    // Returns scanned items (all on-sale in this fixture)
    expect(result).toHaveLength(500);
    // Sentry warning (not exception) fires to alert ops
    expect(sentryMock.captureMessage).toHaveBeenCalledOnce();
    expect(sentryMock.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("scan ceiling"),
      expect.objectContaining({ level: "warning" }),
    );
    expect(sentryMock.captureException).not.toHaveBeenCalled();
  });

  it("does NOT fire Sentry warning when collection is exactly at limit but no more pages", async () => {
    // 500 items, hasNext=false on last page → no warning
    const pages: MockProduct[][] = Array.from({ length: 5 }, () =>
      Array.from({ length: 100 }, (_, i) => onSale(`p${i}`)),
    );

    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => makeClient(pages),
    }));

    const { listProductsOnSale } = await import("@/lib/wix/products");
    const result = await listProductsOnSale("col-1");

    expect(result).toHaveLength(500);
    expect(sentryMock.captureMessage).not.toHaveBeenCalled();
  });
});
