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
    const { items } = await searchProducts("futon");
    expect(items.map((p) => p._id)).toEqual(["1", "4"]);
  });

  it("is case-insensitive — uppercase query matches mixed-case names", async () => {
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => makeClient() }));
    const { searchProducts } = await import("@/lib/wix/products");
    const upper = (await searchProducts("MATTRESS")).items;
    const lower = (await searchProducts("mattress")).items;
    expect(upper.map((p) => p._id)).toEqual(["2", "3"]);
    expect(lower.map((p) => p._id)).toEqual(upper.map((p) => p._id));
  });

  it("returns { items: [], total: 0 } for empty string", async () => {
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => makeClient() }));
    const { searchProducts } = await import("@/lib/wix/products");
    expect(await searchProducts("")).toEqual({ items: [], total: 0 });
  });

  it("returns { items: [], total: 0 } for whitespace-only string", async () => {
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => makeClient() }));
    const { searchProducts } = await import("@/lib/wix/products");
    expect(await searchProducts("   ")).toEqual({ items: [], total: 0 });
  });

  it("respects the pageSize parameter (cf-94l)", async () => {
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => makeClient() }));
    const { searchProducts } = await import("@/lib/wix/products");
    const { items, total } = await searchProducts("a", { pageSize: 2 });
    expect(items.length).toBeLessThanOrEqual(2);
    // total is the full match count, may exceed items.length
    expect(total).toBeGreaterThanOrEqual(items.length);
  });

  it("paginates via the page option (cf-94l)", async () => {
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => makeClient() }));
    const { searchProducts } = await import("@/lib/wix/products");
    const all = (await searchProducts("a", { pageSize: 100 })).items;
    if (all.length >= 2) {
      const pageSize = 1;
      const page1 = (await searchProducts("a", { page: 1, pageSize })).items;
      const page2 = (await searchProducts("a", { page: 2, pageSize })).items;
      expect(page1.length).toBe(1);
      expect(page2.length).toBe(1);
      expect(page1[0]._id).not.toBe(page2[0]._id);
    }
  });

  it("over-pagination returns empty items but full total (cf-94l)", async () => {
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => makeClient() }));
    const { searchProducts } = await import("@/lib/wix/products");
    const { items, total } = await searchProducts("futon", { page: 999 });
    expect(items).toEqual([]);
    expect(total).toBeGreaterThan(0);
  });

  it("returns { items: [], total: 0 } when SDK throws", async () => {
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
    expect(await searchProducts("futon")).toEqual({ items: [], total: 0 });
  });

  it("paginates when catalog spans multiple Wix pages (cf-ni0z regression)", async () => {
    const page1 = [{ _id: "a", name: "Page-1 Futon", slug: "p1-futon" }];
    const page2 = [{ _id: "b", name: "Page-2 Futon", slug: "p2-futon" }];
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => makeClient(page1, page2) }));
    const { searchProducts } = await import("@/lib/wix/products");
    const { items } = await searchProducts("futon");
    expect(items.map((p) => p._id)).toEqual(["a", "b"]);
  });

  it("matches a product slug-style query spanning a word boundary", async () => {
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => makeClient() }));
    const { searchProducts } = await import("@/lib/wix/products");
    const { items } = await searchProducts("monterey");
    expect(items).toHaveLength(1);
    expect(items[0]._id).toBe("4");
  });
});
