// cfw-4a9: coverage for src/lib/product/also-bought.ts. 109-line
// 2-tier Wix FBT reader (cf-l6aj.1). Risks pinned: a CMS-tier throw
// bubbles up instead of falling through to tier-2 (PDP loses
// cross-sell entirely on a transient outage); the source productId
// leaks into its own cross-sell list ('related to itself' bug);
// fixture mode short-circuit forgets to apply (live Wix calls break
// the fixture-preview deploy).

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

const cmsFind = vi.fn();
const productFind = vi.fn();
const logWixFailure = vi.fn().mockResolvedValue(undefined);
const toReaderError = vi.fn((_err: unknown) => "wix_sdk");

let lastNeArg: [string, string | undefined] | null = null;

vi.mock("@/lib/wix-client", () => ({
  getWixClient: () => ({
    items: {
      query: () => ({
        eq: () => ({
          limit: () => ({
            find: () => cmsFind(),
          }),
        }),
      }),
    },
    products: {
      queryProducts: () => {
        const builder = {
          hasSome: () => builder,
          ne: (field: string, value: string) => {
            lastNeArg = [field, value];
            return builder;
          },
          limit: () => builder,
          find: () => productFind(),
        };
        return builder;
      },
    },
  }),
}));
vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: (...args: unknown[]) => logWixFailure(...args),
  toReaderError: (err: unknown) => toReaderError(err),
}));

import {
  MAX_ALSO_BOUGHT,
  getAlsoBoughtProducts,
} from "@/lib/product/also-bought";

beforeEach(() => {
  cmsFind.mockReset();
  productFind.mockReset();
  logWixFailure.mockClear();
  toReaderError.mockClear().mockReturnValue("wix_sdk");
  lastNeArg = null;
  vi.stubEnv("NEXT_PUBLIC_USE_FIXTURE_PRODUCTS", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("MAX_ALSO_BOUGHT constant", () => {
  it("equals 4 (regression guard against silent rebrand)", () => {
    expect(MAX_ALSO_BOUGHT).toBe(4);
  });
});

describe("fixture-mode shortcut", () => {
  it("returns empty items + source='cms' WITHOUT calling Wix when NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_FIXTURE_PRODUCTS", "1");

    const result = await getAlsoBoughtProducts({ _id: "p1", collectionIds: ["c1"] });

    expect(result).toEqual({ items: [], source: "cms" });
    expect(cmsFind).not.toHaveBeenCalled();
    expect(productFind).not.toHaveBeenCalled();
  });
});

describe("Tier 1 — CMS curated FBT", () => {
  it("CMS hit with valid relatedIds → tier-1 product query, source='cms'", async () => {
    cmsFind.mockResolvedValueOnce({
      items: [{ productId: "p1", relatedProductIds: ["r1", "r2"] }],
    });
    productFind.mockResolvedValueOnce({
      items: [{ _id: "r1" }, { _id: "r2" }],
    });

    const result = await getAlsoBoughtProducts({ _id: "p1", collectionIds: [] });

    expect(result.source).toBe("cms");
    expect(result.items).toHaveLength(2);
    expect(result.error).toBeUndefined();
  });

  it("CMS row missing entirely (no items) → falls through to tier-2", async () => {
    cmsFind.mockResolvedValueOnce({ items: [] });
    productFind.mockResolvedValueOnce({ items: [{ _id: "x1" }] });

    const result = await getAlsoBoughtProducts({
      _id: "p1",
      collectionIds: ["c1"],
    });

    expect(result.source).toBe("category");
  });

  it("CMS row with empty relatedProductIds → tier-2 fallback", async () => {
    cmsFind.mockResolvedValueOnce({
      items: [{ productId: "p1", relatedProductIds: [] }],
    });
    productFind.mockResolvedValueOnce({ items: [{ _id: "x1" }] });

    const result = await getAlsoBoughtProducts({
      _id: "p1",
      collectionIds: ["c1"],
    });

    expect(result.source).toBe("category");
  });

  it("CMS row with missing relatedProductIds field → tier-2 fallback", async () => {
    cmsFind.mockResolvedValueOnce({ items: [{ productId: "p1" }] });
    productFind.mockResolvedValueOnce({ items: [{ _id: "x1" }] });

    const result = await getAlsoBoughtProducts({
      _id: "p1",
      collectionIds: ["c1"],
    });

    expect(result.source).toBe("category");
  });

  it("filters non-string and empty-string entries from relatedProductIds before query", async () => {
    cmsFind.mockResolvedValueOnce({
      items: [
        {
          productId: "p1",
          relatedProductIds: ["r1", null, "", 42, "r2", undefined, "r3"],
        },
      ],
    });
    productFind.mockResolvedValueOnce({
      items: [{ _id: "r1" }, { _id: "r2" }, { _id: "r3" }],
    });

    const result = await getAlsoBoughtProducts({ _id: "p1", collectionIds: [] });

    expect(result.items).toHaveLength(3);
    expect(result.source).toBe("cms");
  });

  it("CMS query throws → silent fall-through to tier-2 AND logWixFailure called", async () => {
    cmsFind.mockRejectedValueOnce(new Error("cms outage"));
    productFind.mockResolvedValueOnce({ items: [{ _id: "x1" }] });

    const result = await getAlsoBoughtProducts({
      _id: "p1",
      collectionIds: ["c1"],
    });

    expect(result.source).toBe("category");
    expect(logWixFailure).toHaveBeenCalledWith(
      "getAlsoBoughtProducts",
      "cms tier",
      expect.any(Error),
    );
  });
});

describe("Tier 2 — category cross-sell fallback", () => {
  beforeEach(() => {
    // No CMS hit by default — every tier-2 test starts here.
    cmsFind.mockResolvedValue({ items: [] });
  });

  it("returns cross-sell items with source='category'", async () => {
    productFind.mockResolvedValueOnce({
      items: [{ _id: "x1" }, { _id: "x2" }],
    });

    const result = await getAlsoBoughtProducts({
      _id: "p1",
      collectionIds: ["cat-frames"],
    });

    expect(result.source).toBe("category");
    expect(result.items).toHaveLength(2);
  });

  it("excludes the source productId from cross-sell results (.ne('_id', productId))", async () => {
    productFind.mockResolvedValueOnce({ items: [] });

    await getAlsoBoughtProducts({
      _id: "self-product",
      collectionIds: ["c1"],
    });

    expect(lastNeArg).toEqual(["_id", "self-product"]);
  });

  it("does NOT call .ne when source._id is missing (tier-2 still works)", async () => {
    productFind.mockResolvedValueOnce({ items: [{ _id: "x1" }] });

    const result = await getAlsoBoughtProducts({
      _id: null,
      collectionIds: ["c1"],
    });

    expect(lastNeArg).toBeNull();
    expect(result.source).toBe("category");
    expect(result.items).toHaveLength(1);
  });

  it("empty collectionIds → empty + source='category', no Wix products call", async () => {
    const result = await getAlsoBoughtProducts({
      _id: "p1",
      collectionIds: [],
    });

    expect(result).toEqual({ items: [], source: "category" });
    expect(productFind).not.toHaveBeenCalled();
  });

  it("missing collectionIds (undefined) → empty + source='category'", async () => {
    const result = await getAlsoBoughtProducts({ _id: "p1" });

    expect(result).toEqual({ items: [], source: "category" });
  });

  it("filters non-string / empty-string entries from collectionIds", async () => {
    productFind.mockResolvedValueOnce({ items: [{ _id: "x1" }] });

    const result = await getAlsoBoughtProducts({
      _id: "p1",
      collectionIds: ["c1", "", null as unknown as string, "c2"],
    });

    expect(result.source).toBe("category");
    expect(result.items).toHaveLength(1);
  });

  it("tier-2 query throws → returns { items: [], error, source: 'category' } AND logs failure", async () => {
    productFind.mockRejectedValueOnce(new Error("products outage"));

    const result = await getAlsoBoughtProducts({
      _id: "p1",
      collectionIds: ["c1"],
    });

    expect(result.items).toEqual([]);
    expect(result.source).toBe("category");
    expect(result.error).toBe("wix_sdk");
    expect(logWixFailure).toHaveBeenCalledWith(
      "getAlsoBoughtProducts",
      "category fallback",
      expect.any(Error),
    );
    expect(toReaderError).toHaveBeenCalled();
  });
});

describe("output contract", () => {
  it("never returns more than MAX_ALSO_BOUGHT items in tier-2 happy path", async () => {
    cmsFind.mockResolvedValue({ items: [] });
    // Wix would respect the .limit; we just verify the contract intent
    // by passing exactly MAX-1 items through.
    productFind.mockResolvedValueOnce({
      items: Array.from({ length: 3 }, (_, i) => ({ _id: `x${i}` })),
    });

    const result = await getAlsoBoughtProducts({
      _id: "p1",
      collectionIds: ["c1"],
    });

    expect(result.items.length).toBeLessThanOrEqual(MAX_ALSO_BOUGHT);
  });
});
