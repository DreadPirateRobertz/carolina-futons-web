import { describe, it, expect, vi, beforeEach } from "vitest";

type MockProduct = {
  _id: string;
  name: string;
  slug?: string;
  collectionIds?: string[];
  priceData?: { price?: number; formatted?: { price?: string }; currency?: string };
};

type FindResult = {
  items: MockProduct[];
  totalCount: number;
  hasNext: () => boolean;
  hasPrev: () => boolean;
  next: () => Promise<FindResult>;
};

// Mock chain that records the calls the reader makes so tests can assert
// hasSome(collectionIds, ...) + ne("_id", <source>) + limit(N).
function makeChain(matching: MockProduct[]) {
  const calls: { method: string; args: unknown[] }[] = [];
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const makeFindResult = (items: MockProduct[]): FindResult => ({
    items,
    totalCount: items.length,
    hasNext: () => false,
    hasPrev: () => false,
    next: async () => makeFindResult(items),
  });
  for (const m of ["hasSome", "eq", "ne", "limit", "ascending", "descending"]) {
    chain[m] = vi.fn((...args: unknown[]) => {
      calls.push({ method: m, args });
      return chain;
    });
  }
  chain.find = vi.fn(async () => makeFindResult(matching));
  return { chain, calls };
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

function p(id: string, name: string, opts: { collectionIds?: string[]; basePrice?: number } = {}): MockProduct {
  return {
    _id: id,
    name,
    slug: `${id}-slug`,
    collectionIds: opts.collectionIds ?? [],
    priceData: { price: opts.basePrice ?? 100, currency: "USD", formatted: { price: `$${opts.basePrice ?? 100}` } },
  };
}

describe("getCrossSellProducts — success", () => {
  it("queries products in the source product's collections, excluding the source itself", async () => {
    const source = p("src-1", "Source", { collectionIds: ["col-futons", "col-bestsellers"] });
    const matches = [
      p("rel-a", "Related A", { collectionIds: ["col-futons"] }),
      p("rel-b", "Related B", { collectionIds: ["col-futons"] }),
    ];
    const { chain, calls } = makeChain(matches);
    const client = { products: { queryProducts: vi.fn(() => chain) } };
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { getCrossSellProducts } = await import("@/lib/product/cross-sell");
    const result = await getCrossSellProducts(source);

    expect(result.error).toBeUndefined();
    expect(result.items.map((x) => x._id)).toEqual(["rel-a", "rel-b"]);
    // Must filter by the source's collections
    expect(calls.find((c) => c.method === "hasSome")).toMatchObject({
      method: "hasSome",
      args: ["collectionIds", ["col-futons", "col-bestsellers"]],
    });
    // Must exclude the source product itself
    expect(calls.find((c) => c.method === "ne")).toMatchObject({
      method: "ne",
      args: ["_id", "src-1"],
    });
  });

  it("respects the limit option (default 4)", async () => {
    const source = p("src-1", "Source", { collectionIds: ["col-futons"] });
    const { chain, calls } = makeChain([]);
    const client = { products: { queryProducts: vi.fn(() => chain) } };
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { getCrossSellProducts } = await import("@/lib/product/cross-sell");
    await getCrossSellProducts(source, { limit: 6 });

    expect(calls.find((c) => c.method === "limit")).toMatchObject({ args: [6] });
  });

  it("uses limit=4 by default when opts omitted", async () => {
    const source = p("src-1", "Source", { collectionIds: ["col-futons"] });
    const { chain, calls } = makeChain([]);
    const client = { products: { queryProducts: vi.fn(() => chain) } };
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { getCrossSellProducts } = await import("@/lib/product/cross-sell");
    await getCrossSellProducts(source);

    expect(calls.find((c) => c.method === "limit")).toMatchObject({ args: [4] });
  });

  it("returns empty items with NO error when the source product has no collections", async () => {
    // A product with no collections can't generate a meaningful cross-sell set.
    // Return [] (not a "wix_sdk" error) — this is a legitimate empty state, not a failure.
    const source: MockProduct = { _id: "src-1", name: "Solo", collectionIds: [] };
    const client = { products: { queryProducts: vi.fn() } };
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { getCrossSellProducts } = await import("@/lib/product/cross-sell");
    const result = await getCrossSellProducts(source);

    expect(result.items).toEqual([]);
    expect(result.error).toBeUndefined();
    // Must NOT have called the SDK when there are no collections to query.
    expect(client.products.queryProducts).not.toHaveBeenCalled();
  });
});

describe("getCrossSellProducts — error handling", () => {
  it("on SDK failure returns error-tagged empty and reports to Sentry (matches PR #35 pattern)", async () => {
    const source = p("src-1", "Source", { collectionIds: ["col-futons"] });
    const client = {
      products: {
        queryProducts: () => ({
          hasSome: () => ({
            ne: () => ({
              limit: () => ({ find: async () => { throw new Error("wix down"); } }),
            }),
          }),
        }),
      },
    };
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { getCrossSellProducts } = await import("@/lib/product/cross-sell");
    const result = await getCrossSellProducts(source);

    expect(result.items).toEqual([]);
    expect(result.error).toBe("unexpected");
    expect(sentryMock.captureException).toHaveBeenCalledTimes(1);
    expect(sentryMock.flush).toHaveBeenCalled();
  });

  it("tags error as 'wix_sdk' when thrown error matches the Wix SDK shape", async () => {
    const source = p("src-1", "Source", { collectionIds: ["col-futons"] });
    const wixLike = Object.assign(new Error("Rate limited"), { code: "RATE_LIMIT" });
    const client = {
      products: {
        queryProducts: () => ({
          hasSome: () => ({
            ne: () => ({ limit: () => ({ find: async () => { throw wixLike; } }) }),
          }),
        }),
      },
    };
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { getCrossSellProducts } = await import("@/lib/product/cross-sell");
    const result = await getCrossSellProducts(source);

    expect(result.error).toBe("wix_sdk");
  });

  it("throws on invalid limit (NaN, negative, non-integer) — boundary contract", async () => {
    const source = p("src-1", "Source", { collectionIds: ["col-futons"] });
    const { chain } = makeChain([]);
    const client = { products: { queryProducts: vi.fn(() => chain) } };
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));

    const { getCrossSellProducts } = await import("@/lib/product/cross-sell");
    await expect(getCrossSellProducts(source, { limit: Number.NaN })).rejects.toThrow(/positive integer/);
    await expect(getCrossSellProducts(source, { limit: -1 })).rejects.toThrow(/positive integer/);
    await expect(getCrossSellProducts(source, { limit: 2.5 })).rejects.toThrow(/positive integer/);
  });
});
