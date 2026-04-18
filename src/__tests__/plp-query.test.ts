import { describe, it, expect, vi, beforeEach } from "vitest";

// Deliberately typed loosely — the mock only implements the subset of the Wix
// SDK shape the reader uses, not the full generated type.
type MockProduct = {
  _id: string;
  name: string;
  priceData?: { price?: number; formatted?: { price?: string }; currency?: string };
  priceRange?: { minValue?: number; maxValue?: number };
  stock?: { inStock?: boolean };
  lastUpdated?: string;
};

type Chain = {
  hasSome: ReturnType<typeof vi.fn>;
  ascending: ReturnType<typeof vi.fn>;
  descending: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  skip: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
};

type FindResult = {
  items: MockProduct[];
  totalCount: number;
  hasNext: () => boolean;
  hasPrev: () => boolean;
  next: () => Promise<FindResult>;
};

function makeChain(allItems: MockProduct[]) {
  const state = { skipN: 0, limitN: 100 };
  const findImpl = async (): Promise<FindResult> => {
    const slice = allItems.slice(state.skipN, state.skipN + state.limitN);
    const totalCount = allItems.length;
    return {
      items: slice,
      totalCount,
      hasNext: () => state.skipN + slice.length < totalCount,
      hasPrev: () => state.skipN > 0,
      next: async () => {
        state.skipN += state.limitN;
        return findImpl();
      },
    };
  };
  const chain: Chain = {
    hasSome: vi.fn(() => chain),
    ascending: vi.fn(() => chain),
    descending: vi.fn(() => chain),
    limit: vi.fn((n: number) => {
      state.limitN = n;
      return chain;
    }),
    skip: vi.fn((n: number) => {
      state.skipN = n;
      return chain;
    }),
    find: vi.fn(async () => findImpl()),
  };
  return { chain, state };
}

function mockWixClient(items: MockProduct[]) {
  const { chain, state } = makeChain(items);
  return {
    client: { products: { queryProducts: vi.fn(() => chain) } },
    chain,
    state,
  };
}

const sentryMock = vi.hoisted(() => ({
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));
vi.mock("@sentry/nextjs", () => sentryMock);

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

// ── Fixture builder ─────────────────────────────────────────────────────────
function p(
  id: string,
  name: string,
  opts: {
    basePrice?: number;
    rangeMin?: number;
    rangeMax?: number;
    inStock?: boolean;
    lastUpdated?: string;
  } = {},
): MockProduct {
  const price = opts.basePrice ?? 0;
  return {
    _id: id,
    name,
    priceData: {
      price,
      currency: "USD",
      formatted: { price: price ? `$${price}` : "$0.00" },
    },
    priceRange:
      opts.rangeMin !== undefined || opts.rangeMax !== undefined
        ? { minValue: opts.rangeMin, maxValue: opts.rangeMax }
        : undefined,
    stock: { inStock: opts.inStock ?? true },
    lastUpdated: opts.lastUpdated ?? "2026-01-01T00:00:00Z",
  };
}

describe("listPlpProducts — pagination", () => {
  it("returns the first page with total, page, pageSize, hasNext, hasPrev", async () => {
    const items: MockProduct[] = Array.from({ length: 30 }, (_, i) =>
      p(`id-${i}`, `Product ${i}`, { basePrice: 100 + i }),
    );
    const { client } = mockWixClient(items);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listPlpProducts } = await import("@/lib/wix/plp");
    const page = await listPlpProducts("col-1", { page: 1, pageSize: 12 });

    expect(page.total).toBe(30);
    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(12);
    expect(page.items).toHaveLength(12);
    expect(page.hasNext).toBe(true);
    expect(page.hasPrev).toBe(false);
  });

  it("returns page 2 with hasPrev=true and correct offset items", async () => {
    const items: MockProduct[] = Array.from({ length: 30 }, (_, i) =>
      p(`id-${i}`, `Product ${i}`, { basePrice: 100 + i }),
    );
    const { client } = mockWixClient(items);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listPlpProducts } = await import("@/lib/wix/plp");
    const page = await listPlpProducts("col-1", { page: 2, pageSize: 12 });

    expect(page.page).toBe(2);
    expect(page.items).toHaveLength(12);
    expect(page.items[0]?._id).toBe("id-12");
    expect(page.hasPrev).toBe(true);
    expect(page.hasNext).toBe(true);
  });

  it("on the last partial page, hasNext=false", async () => {
    const items: MockProduct[] = Array.from({ length: 30 }, (_, i) =>
      p(`id-${i}`, `Product ${i}`, { basePrice: 100 + i }),
    );
    const { client } = mockWixClient(items);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listPlpProducts } = await import("@/lib/wix/plp");
    const page = await listPlpProducts("col-1", { page: 3, pageSize: 12 });

    expect(page.page).toBe(3);
    expect(page.items).toHaveLength(6);
    expect(page.hasNext).toBe(false);
    expect(page.hasPrev).toBe(true);
  });

  it("defaults page=1, pageSize=24, sort='featured' when opts omitted", async () => {
    const items: MockProduct[] = Array.from({ length: 5 }, (_, i) =>
      p(`id-${i}`, `Product ${i}`, { basePrice: 10 }),
    );
    const { client } = mockWixClient(items);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listPlpProducts } = await import("@/lib/wix/plp");
    const page = await listPlpProducts("col-1");

    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(24);
    expect(page.total).toBe(5);
  });

  it("passes collectionId through hasSome('collectionIds', [id])", async () => {
    const { client, chain } = mockWixClient([]);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listPlpProducts } = await import("@/lib/wix/plp");
    await listPlpProducts("col-abc");

    expect(chain.hasSome).toHaveBeenCalledWith("collectionIds", ["col-abc"]);
  });

  it("returns empty page on SDK failure (does not throw)", async () => {
    const client = {
      products: {
        queryProducts: () => ({
          hasSome: () => ({
            limit: () => ({ find: async () => { throw new Error("wix down"); } }),
          }),
        }),
      },
    };
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { listPlpProducts } = await import("@/lib/wix/plp");
    const page = await listPlpProducts("col-1", { pageSize: 12 });

    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
    expect(page.hasNext).toBe(false);
    expect(page.hasPrev).toBe(false);
  });
});

describe("listPlpProducts — sort", () => {
  const catalog: MockProduct[] = [
    p("a", "Alpha", { basePrice: 300, lastUpdated: "2026-03-01T00:00:00Z" }),
    p("b", "Bravo", { basePrice: 100, lastUpdated: "2026-01-01T00:00:00Z" }),
    p("c", "Charlie", { basePrice: 200, lastUpdated: "2026-02-01T00:00:00Z" }),
  ];

  it("sort='price-asc' orders by effective min price ascending", async () => {
    const { client } = mockWixClient(catalog);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listPlpProducts } = await import("@/lib/wix/plp");
    const page = await listPlpProducts("col", { sort: "price-asc" });

    expect(page.items.map((x) => x._id)).toEqual(["b", "c", "a"]);
  });

  it("sort='price-desc' orders by effective price descending", async () => {
    const { client } = mockWixClient(catalog);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listPlpProducts } = await import("@/lib/wix/plp");
    const page = await listPlpProducts("col", { sort: "price-desc" });

    expect(page.items.map((x) => x._id)).toEqual(["a", "c", "b"]);
  });

  it("sort='name-asc' orders by name case-insensitive ascending", async () => {
    const mixed: MockProduct[] = [
      p("1", "charlie"),
      p("2", "Alpha"),
      p("3", "BRAVO"),
    ];
    const { client } = mockWixClient(mixed);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listPlpProducts } = await import("@/lib/wix/plp");
    const page = await listPlpProducts("col", { sort: "name-asc" });

    expect(page.items.map((x) => x._id)).toEqual(["2", "3", "1"]);
  });

  it("sort='newest' orders by lastUpdated descending", async () => {
    const { client } = mockWixClient(catalog);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listPlpProducts } = await import("@/lib/wix/plp");
    const page = await listPlpProducts("col", { sort: "newest" });

    expect(page.items.map((x) => x._id)).toEqual(["a", "c", "b"]);
  });

  it("price-asc uses priceRange.minValue when base priceData.price is 0", async () => {
    const variantCatalog: MockProduct[] = [
      p("hi", "High", { basePrice: 0, rangeMin: 1000, rangeMax: 2000 }),
      p("lo", "Low", { basePrice: 0, rangeMin: 200, rangeMax: 500 }),
      p("mid", "Mid", { basePrice: 0, rangeMin: 600, rangeMax: 900 }),
    ];
    const { client } = mockWixClient(variantCatalog);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listPlpProducts } = await import("@/lib/wix/plp");
    const page = await listPlpProducts("col", { sort: "price-asc" });

    expect(page.items.map((x) => x._id)).toEqual(["lo", "mid", "hi"]);
  });
});

describe("listPlpProducts — filters", () => {
  const catalog: MockProduct[] = [
    p("a", "Alpha", { basePrice: 99, inStock: true }),
    p("b", "Bravo", { basePrice: 250, inStock: true }),
    p("c", "Charlie", { basePrice: 500, inStock: false }),
    p("d", "Delta", { basePrice: 0, rangeMin: 800, rangeMax: 1200, inStock: true }),
  ];

  it("priceMin filters out products below the floor", async () => {
    const { client } = mockWixClient(catalog);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listPlpProducts } = await import("@/lib/wix/plp");
    const page = await listPlpProducts("col", { filters: { priceMin: 200 } });

    expect(page.items.map((x) => x._id)).toEqual(["b", "c", "d"]);
    expect(page.total).toBe(3);
  });

  it("priceMax filters out products above the ceiling", async () => {
    const { client } = mockWixClient(catalog);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listPlpProducts } = await import("@/lib/wix/plp");
    const page = await listPlpProducts("col", { filters: { priceMax: 300 } });

    expect(page.items.map((x) => x._id)).toEqual(["a", "b"]);
    expect(page.total).toBe(2);
  });

  it("inStockOnly filters out products marked out of stock", async () => {
    const { client } = mockWixClient(catalog);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listPlpProducts } = await import("@/lib/wix/plp");
    const page = await listPlpProducts("col", { filters: { inStockOnly: true } });

    expect(page.items.map((x) => x._id)).toEqual(["a", "b", "d"]);
  });

  it("total reflects post-filter count, not pre-filter catalog size", async () => {
    const { client } = mockWixClient(catalog);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { listPlpProducts } = await import("@/lib/wix/plp");
    const page = await listPlpProducts("col", {
      filters: { priceMin: 100, priceMax: 600 },
      pageSize: 1,
      page: 1,
    });

    expect(page.total).toBe(2);
    expect(page.hasNext).toBe(true);
  });
});

describe("computeFacets", () => {
  it("counts products into default price buckets", async () => {
    const products: MockProduct[] = [
      p("a", "Alpha", { basePrice: 99 }),
      p("b", "Bravo", { basePrice: 250 }),
      p("c", "Charlie", { basePrice: 500 }),
      p("d", "Delta", { basePrice: 1500 }),
      p("e", "Echo", { basePrice: 3000 }),
    ];
    const { computeFacets } = await import("@/lib/wix/plp");
    const facets = computeFacets(products);

    expect(facets.total).toBe(5);
    const underTwo = facets.priceBuckets.find((b) => b.max === 200);
    const twoToFive = facets.priceBuckets.find((b) => b.min === 200 && b.max === 500);
    const fiveToK = facets.priceBuckets.find((b) => b.min === 500 && b.max === 1000);
    const kToTwoK = facets.priceBuckets.find((b) => b.min === 1000 && b.max === 2000);
    const overTwoK = facets.priceBuckets.find((b) => b.min === 2000 && b.max === undefined);

    expect(underTwo?.count).toBe(1); // a=99
    expect(twoToFive?.count).toBe(1); // b=250 (max 500 exclusive)
    expect(fiveToK?.count).toBe(1); // c=500
    expect(kToTwoK?.count).toBe(1); // d=1500
    expect(overTwoK?.count).toBe(1); // e=3000
  });

  it("uses priceRange.minValue as effective price when base is 0 (variant products)", async () => {
    const products: MockProduct[] = [
      p("variant", "Variant only", { basePrice: 0, rangeMin: 350, rangeMax: 800 }),
    ];
    const { computeFacets } = await import("@/lib/wix/plp");
    const facets = computeFacets(products);

    const twoToFive = facets.priceBuckets.find((b) => b.min === 200 && b.max === 500);
    expect(twoToFive?.count).toBe(1);
  });

  it("counts inStock vs outOfStock", async () => {
    const products: MockProduct[] = [
      p("a", "Alpha", { basePrice: 100, inStock: true }),
      p("b", "Bravo", { basePrice: 200, inStock: false }),
      p("c", "Charlie", { basePrice: 300, inStock: true }),
    ];
    const { computeFacets } = await import("@/lib/wix/plp");
    const facets = computeFacets(products);

    expect(facets.inStock).toBe(2);
    expect(facets.outOfStock).toBe(1);
  });

  it("respects custom priceBuckets", async () => {
    const products: MockProduct[] = [
      p("a", "Alpha", { basePrice: 50 }),
      p("b", "Bravo", { basePrice: 150 }),
    ];
    const { computeFacets } = await import("@/lib/wix/plp");
    const facets = computeFacets(products, {
      priceBuckets: [
        { label: "Cheap", min: 0, max: 100 },
        { label: "Expensive", min: 100 },
      ],
    });

    expect(facets.priceBuckets).toHaveLength(2);
    expect(facets.priceBuckets[0]).toMatchObject({ label: "Cheap", count: 1 });
    expect(facets.priceBuckets[1]).toMatchObject({ label: "Expensive", count: 1 });
  });

  it("handles empty input", async () => {
    const { computeFacets } = await import("@/lib/wix/plp");
    const facets = computeFacets([]);
    expect(facets.total).toBe(0);
    expect(facets.inStock).toBe(0);
    expect(facets.outOfStock).toBe(0);
    expect(facets.priceBuckets.every((b) => b.count === 0)).toBe(true);
  });
});

describe("queryAllProductsByCollection — multi-page pagination", () => {
  it("paginates through multiple SDK pages up to the scanLimit ceiling", async () => {
    // 250 items; SDK max page = 100; expect the reader to walk until exhausted.
    const items: MockProduct[] = Array.from({ length: 250 }, (_, i) =>
      p(`id-${i}`, `P${i}`, { basePrice: 100 + i }),
    );
    const { client } = mockWixClient(items);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { queryAllProductsByCollection } = await import("@/lib/wix/plp");
    const all = await queryAllProductsByCollection("col");

    expect(all).toHaveLength(250);
    expect(all[0]?._id).toBe("id-0");
    expect(all[249]?._id).toBe("id-249");
  });

  it("stops at scanLimit when catalog exceeds it", async () => {
    const items: MockProduct[] = Array.from({ length: 700 }, (_, i) =>
      p(`id-${i}`, `P${i}`, { basePrice: 50 }),
    );
    const { client } = mockWixClient(items);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { queryAllProductsByCollection } = await import("@/lib/wix/plp");
    const all = await queryAllProductsByCollection("col", { scanLimit: 200 });

    expect(all).toHaveLength(200);
  });
});
