// cf-3qt.6.D F2: PLP resolver integration coverage.
//
// The on-sale predicate (isProductOnSale) is unit-tested, but miquella's
// 5-agent review flagged that the wiring actually changing /shop/mattresses-sale
// behavior was untested — listProductsOnSale is the resolver glue between the
// Wix SDK query and the filter, and a predicate inversion or wrong field name
// would slip through a predicate-only test. These tests drive listProductsOnSale
// through the real Wix-client chain (mocked at the SDK boundary) with a mixed
// fixture of discounted + full-price mattresses, asserting only the on-sale
// subset comes back.
import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

type Product = {
  _id: string;
  name: string;
  priceData: { price: number; discountedPrice?: number };
  collectionIds?: string[];
};

function mockWixClientWithProducts(items: Product[]) {
  // Single-page fixture — F1 pagination (PR #50) added while/page.next() so the
  // mock needs hasNext()+next() to drive the real loop. Tests that need
  // multi-page traversal should build a dedicated mock.
  const page = { items, hasNext: () => false, next: async () => page };
  const findFn = vi.fn(async () => page);
  const limitFn = vi.fn(() => ({ find: findFn }));
  const hasSomeFn = vi.fn(() => ({ limit: limitFn }));
  const queryProductsFn = vi.fn(() => ({ hasSome: hasSomeFn, limit: limitFn }));
  return {
    client: { products: { queryProducts: queryProductsFn } },
    spies: { queryProductsFn, hasSomeFn, limitFn, findFn },
  };
}

const MIXED_MATTRESSES: Product[] = [
  {
    _id: "m1",
    name: "Latex Queen (on sale)",
    priceData: { price: 1299, discountedPrice: 999 },
    collectionIds: ["col-mattresses"],
  },
  {
    _id: "m2",
    name: "Innerspring Twin (not on sale)",
    priceData: { price: 499 },
    collectionIds: ["col-mattresses"],
  },
  {
    _id: "m3",
    name: "Memory Foam King (on sale)",
    priceData: { price: 1599, discountedPrice: 1299 },
    collectionIds: ["col-mattresses"],
  },
  {
    _id: "m4",
    name: "Cotton Futon (equal-priced, not on sale)",
    priceData: { price: 399, discountedPrice: 399 },
    collectionIds: ["col-mattresses"],
  },
  {
    _id: "m5",
    name: "Mesa-style variant parent (price 0 — manageVariants)",
    priceData: { price: 0, discountedPrice: 799 },
    collectionIds: ["col-mattresses"],
  },
];

describe("listProductsOnSale (PLP resolver integration)", () => {
  it("returns only discounted products from a mixed mattresses fixture", async () => {
    const { client } = mockWixClientWithProducts(MIXED_MATTRESSES);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listProductsOnSale } = await import("@/lib/wix/products");
    const result = await listProductsOnSale("col-mattresses");

    expect(result.map((p) => p._id)).toEqual(["m1", "m3"]);
  });

  it("passes the collectionId to queryProducts().hasSome('collectionIds', ...)", async () => {
    const { client, spies } = mockWixClientWithProducts(MIXED_MATTRESSES);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listProductsOnSale } = await import("@/lib/wix/products");
    await listProductsOnSale("col-mattresses");

    expect(spies.queryProductsFn).toHaveBeenCalledTimes(1);
    expect(spies.hasSomeFn).toHaveBeenCalledWith("collectionIds", [
      "col-mattresses",
    ]);
  });

  it("uses the fixed SALE_PAGE_SIZE (100) for the initial page — F1 pagination invariant", async () => {
    const { client, spies } = mockWixClientWithProducts(MIXED_MATTRESSES);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listProductsOnSale } = await import("@/lib/wix/products");
    await listProductsOnSale("col-mattresses");

    expect(spies.limitFn).toHaveBeenCalledWith(100);
  });

  it("returns empty when the collection has no products on sale", async () => {
    const allFullPrice: Product[] = [
      { _id: "f1", name: "Full-price A", priceData: { price: 500 } },
      {
        _id: "f2",
        name: "Full-price B (discount==price)",
        priceData: { price: 700, discountedPrice: 700 },
      },
    ];
    const { client } = mockWixClientWithProducts(allFullPrice);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listProductsOnSale } = await import("@/lib/wix/products");
    const result = await listProductsOnSale("col-mattresses");

    expect(result).toEqual([]);
  });

  it("returns empty (not 500) when the Wix SDK throws for the collection query", async () => {
    const thrown = {
      message: "timeout",
      code: "NETWORK_ERROR",
      response: { status: 504 },
    };
    const client = {
      products: {
        queryProducts: () => ({
          hasSome: () => ({
            limit: () => ({
              find: async () => {
                throw thrown;
              },
            }),
          }),
        }),
      },
    };
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));
    vi.doMock("@sentry/nextjs", () => ({
      captureException: vi.fn(),
      flush: vi.fn(async () => true),
    }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { listProductsOnSale } = await import("@/lib/wix/products");
    const result = await listProductsOnSale("col-mattresses");

    expect(result).toEqual([]);
  });

  it("excludes Mesa-style manageVariants products with price 0 (cf-3qt.6.E guard)", async () => {
    const { client } = mockWixClientWithProducts(MIXED_MATTRESSES);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listProductsOnSale } = await import("@/lib/wix/products");
    const result = await listProductsOnSale("col-mattresses");

    expect(result.map((p) => p._id)).not.toContain("m5");
  });
});
