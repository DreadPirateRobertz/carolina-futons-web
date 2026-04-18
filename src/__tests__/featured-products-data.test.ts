import { describe, it, expect, vi, beforeEach } from "vitest";

// cf-5j9x: listFeaturedProducts curates 4–6 products for the home page
// Featured strip. Source: Wix catalog via listProducts. Clamped so the
// strip is always renderable (below 4 looks like a bug, above 6 breaks
// the 2×3 / 3×2 grid Figma expects).

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

function makeProduct(id: string, overrides: Record<string, unknown> = {}) {
  return {
    _id: id,
    slug: `slug-${id}`,
    name: `Product ${id}`,
    ...overrides,
  };
}

describe("listFeaturedProducts — selection & clamping", () => {
  it("returns up to FEATURED_MAX (6) products when the catalog is large", async () => {
    const twelve = Array.from({ length: 12 }, (_, i) => makeProduct(`p${i}`));
    vi.doMock("@/lib/wix/products", () => ({ listProducts: vi.fn().mockResolvedValue(twelve) }));
    const { listFeaturedProducts, FEATURED_MAX } = await import("@/lib/shop/featured");
    const result = await listFeaturedProducts();
    expect(result.length).toBe(FEATURED_MAX);
  });

  it("defaults to FEATURED_MAX when called with no argument", async () => {
    const eight = Array.from({ length: 8 }, (_, i) => makeProduct(`p${i}`));
    vi.doMock("@/lib/wix/products", () => ({ listProducts: vi.fn().mockResolvedValue(eight) }));
    const { listFeaturedProducts, FEATURED_MAX } = await import("@/lib/shop/featured");
    const result = await listFeaturedProducts();
    expect(result.length).toBe(FEATURED_MAX);
  });

  it("clamps a requested value above FEATURED_MAX down to FEATURED_MAX", async () => {
    const ten = Array.from({ length: 10 }, (_, i) => makeProduct(`p${i}`));
    vi.doMock("@/lib/wix/products", () => ({ listProducts: vi.fn().mockResolvedValue(ten) }));
    const { listFeaturedProducts, FEATURED_MAX } = await import("@/lib/shop/featured");
    const result = await listFeaturedProducts(999);
    expect(result.length).toBe(FEATURED_MAX);
  });

  it("clamps a requested value below FEATURED_MIN up to FEATURED_MIN", async () => {
    const ten = Array.from({ length: 10 }, (_, i) => makeProduct(`p${i}`));
    vi.doMock("@/lib/wix/products", () => ({ listProducts: vi.fn().mockResolvedValue(ten) }));
    const { listFeaturedProducts, FEATURED_MIN } = await import("@/lib/shop/featured");
    const result = await listFeaturedProducts(1);
    expect(result.length).toBe(FEATURED_MIN);
  });

  it("filters out products without a slug (PDP-unroutable)", async () => {
    const mixed = [
      makeProduct("a"),
      makeProduct("b", { slug: undefined }),
      makeProduct("c"),
      makeProduct("d", { slug: "" }),
      makeProduct("e"),
      makeProduct("f"),
      makeProduct("g"),
    ];
    vi.doMock("@/lib/wix/products", () => ({ listProducts: vi.fn().mockResolvedValue(mixed) }));
    const { listFeaturedProducts } = await import("@/lib/shop/featured");
    const result = await listFeaturedProducts(6);
    for (const p of result) {
      expect(typeof p.slug).toBe("string");
      expect(p.slug).not.toBe("");
    }
  });

  it("returns empty array when the Wix reader returned no products (outage already logged by listProducts)", async () => {
    vi.doMock("@/lib/wix/products", () => ({ listProducts: vi.fn().mockResolvedValue([]) }));
    const { listFeaturedProducts } = await import("@/lib/shop/featured");
    const result = await listFeaturedProducts();
    expect(result).toEqual([]);
  });

  it("returns whatever eligible products exist when fewer than FEATURED_MIN (does not throw)", async () => {
    // Two products is a legit catalog state during launch — we don't synthesise
    // fake entries, we just render what we have. The section itself hides when
    // empty, but non-empty small catalogs render as-is.
    const two = [makeProduct("a"), makeProduct("b")];
    vi.doMock("@/lib/wix/products", () => ({ listProducts: vi.fn().mockResolvedValue(two) }));
    const { listFeaturedProducts } = await import("@/lib/shop/featured");
    const result = await listFeaturedProducts();
    expect(result.length).toBe(2);
  });
});

describe("listFeaturedProducts — oversampling", () => {
  it("requests more than FEATURED_MAX from Wix so filtering has headroom", async () => {
    const spy = vi.fn().mockResolvedValue([]);
    vi.doMock("@/lib/wix/products", () => ({ listProducts: spy }));
    const { listFeaturedProducts, FEATURED_MAX } = await import("@/lib/shop/featured");
    await listFeaturedProducts();
    expect(spy).toHaveBeenCalledTimes(1);
    const requested = spy.mock.calls[0][0] as number;
    expect(requested).toBeGreaterThan(FEATURED_MAX);
  });
});
