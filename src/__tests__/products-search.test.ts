import { describe, it, expect, vi, beforeEach } from "vitest";

// cf-346v: unit tests for the in-memory substring search behaviour.
// Verifies case-insensitivity, mid-word matches, limit enforcement, and
// SDK-error passthrough — the three properties the old startsWith approach lacked.

const sentryMock = vi.hoisted(() => ({
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));

vi.mock("@sentry/nextjs", () => sentryMock);

beforeEach(() => {
  vi.resetModules();
  sentryMock.captureException.mockClear();
});

const CATALOG = [
  { _id: "1", name: "Kingston Futon Frame", slug: "kingston-futon-frame" },
  { _id: "2", name: "Mesa 1000 Mattress", slug: "mesa-1000-mattress" },
  { _id: "3", name: "Mesa 3000 Mattress", slug: "mesa-3000-mattress" },
  { _id: "4", name: "Monterey Futon Frame", slug: "monterey-futon-frame" },
  { _id: "5", name: "Ranchero Platform Bed", slug: "ranchero-platform-bed" },
];

function makePage(items = CATALOG, more: typeof CATALOG = []) {
  const page: {
    items: typeof CATALOG;
    hasNext: () => boolean;
    next: () => Promise<ReturnType<typeof makePage>>;
  } = {
    items,
    hasNext: () => more.length > 0,
    next: async () => makePage(more),
  };
  return page;
}

function makeClient(items = CATALOG, more: typeof CATALOG = []) {
  return {
    products: {
      queryProducts: () => ({
        limit: () => ({
          find: async () => makePage(items, more),
        }),
      }),
    },
  };
}

describe("searchProducts — in-memory substring search", () => {
  it("matches mid-word substring (futon anywhere in name)", async () => {
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => makeClient() }));
    const { searchProducts } = await import("@/lib/wix/products");
    const results = await searchProducts("futon");
    expect(results.map((p) => p._id)).toEqual(["1", "4"]);
  });

  it("is case-insensitive — uppercase query matches mixed-case names", async () => {
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => makeClient() }));
    const { searchProducts } = await import("@/lib/wix/products");
    const upper = await searchProducts("MATTRESS");
    const lower = await searchProducts("mattress");
    expect(upper.map((p) => p._id)).toEqual(["2", "3"]);
    expect(lower.map((p) => p._id)).toEqual(upper.map((p) => p._id));
  });

  it("returns empty array for empty string", async () => {
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => makeClient() }));
    const { searchProducts } = await import("@/lib/wix/products");
    expect(await searchProducts("")).toEqual([]);
  });

  it("returns empty array for whitespace-only string", async () => {
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => makeClient() }));
    const { searchProducts } = await import("@/lib/wix/products");
    expect(await searchProducts("   ")).toEqual([]);
  });

  it("respects the limit parameter", async () => {
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => makeClient() }));
    const { searchProducts } = await import("@/lib/wix/products");
    const results = await searchProducts("a", 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("returns empty array when SDK throws", async () => {
    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => ({
        products: {
          queryProducts: () => ({
            limit: () => ({
              find: async () => {
                throw new Error("Wix SDK error");
              },
            }),
          }),
        },
      }),
    }));
    const { searchProducts } = await import("@/lib/wix/products");
    expect(await searchProducts("futon")).toEqual([]);
  });

  it("paginates when catalog spans multiple Wix pages (cf-ni0z regression)", async () => {
    const page1 = [{ _id: "a", name: "Page-1 Futon", slug: "p1-futon" }];
    const page2 = [{ _id: "b", name: "Page-2 Futon", slug: "p2-futon" }];
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => makeClient(page1, page2) }));
    const { searchProducts } = await import("@/lib/wix/products");
    const results = await searchProducts("futon");
    expect(results.map((p) => p._id)).toEqual(["a", "b"]);
  });

  it("matches a product slug-style query spanning a word boundary", async () => {
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => makeClient() }));
    const { searchProducts } = await import("@/lib/wix/products");
    const results = await searchProducts("monterey");
    expect(results).toHaveLength(1);
    expect(results[0]._id).toBe("4");
  });
});
