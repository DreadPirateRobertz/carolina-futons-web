// cfw-d5h: coverage for src/lib/wix/product-badges.ts. Two Wix CMS
// readers backing PDP + PLP badge rendering. Risks pinned:
// - Wix outage throwing past the wrapper instead of returning [] / empty
//   Map → /products/[slug] 500s instead of rendering un-badged version.
// - Invalid badge strings (e.g. legacy 'BESTSELLER' uppercase) leaking
//   into the rendered chip strip → off-brand UI.

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

const queryCollectionWhere = vi.fn();
const listCollectionItems = vi.fn();
const logWixFailure = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/wix/data", () => ({
  queryCollectionWhere: (...args: unknown[]) => queryCollectionWhere(...args),
  listCollectionItems: (...args: unknown[]) => listCollectionItems(...args),
}));
vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: (...args: unknown[]) => logWixFailure(...args),
}));

import {
  getProductBadges,
  listAllProductBadges,
} from "@/lib/wix/product-badges";

beforeEach(() => {
  queryCollectionWhere.mockReset();
  listCollectionItems.mockReset();
  logWixFailure.mockClear();
});

describe("getProductBadges (PDP)", () => {
  it("returns the parsed badges from the matching Wix row", async () => {
    queryCollectionWhere.mockResolvedValueOnce([
      { productSlug: "kingston", badges: ["New", "Bestseller"] },
    ]);

    const out = await getProductBadges("kingston");
    expect(out).toEqual(["New", "Bestseller"]);
  });

  it("returns [] when no row matches the slug", async () => {
    queryCollectionWhere.mockResolvedValueOnce([]);
    expect(await getProductBadges("missing")).toEqual([]);
  });

  it("returns [] AND logs the failure when Wix throws (page must still render un-badged)", async () => {
    queryCollectionWhere.mockRejectedValueOnce(new Error("wix down"));

    const out = await getProductBadges("kingston");
    expect(out).toEqual([]);
    expect(logWixFailure).toHaveBeenCalledWith(
      "wix-cms",
      "getProductBadges(kingston)",
      expect.any(Error),
    );
  });

  it("filters out invalid badge values (legacy uppercase, typos, non-strings)", async () => {
    queryCollectionWhere.mockResolvedValueOnce([
      {
        productSlug: "k",
        badges: [
          "New",
          "BESTSELLER", // case-mismatched legacy value
          "Sale",
          "Hand-crafted", // not in the union
          42, // wrong type
          null, // wrong type
          "CF+ Exclusive",
        ],
      },
    ]);

    expect(await getProductBadges("k")).toEqual([
      "New",
      "Sale",
      "CF+ Exclusive",
    ]);
  });

  it("returns [] when the row's badges field is not an array (defensive)", async () => {
    queryCollectionWhere.mockResolvedValueOnce([
      { productSlug: "k", badges: "Sale" }, // string, not array
    ]);
    expect(await getProductBadges("k")).toEqual([]);

    queryCollectionWhere.mockResolvedValueOnce([
      { productSlug: "k", badges: undefined },
    ]);
    expect(await getProductBadges("k")).toEqual([]);

    queryCollectionWhere.mockResolvedValueOnce([
      { productSlug: "k" }, // no badges field at all
    ]);
    expect(await getProductBadges("k")).toEqual([]);
  });

  it("queries the ProductBadges collection by productSlug with limit 1", async () => {
    queryCollectionWhere.mockResolvedValueOnce([]);
    await getProductBadges("kingston");
    expect(queryCollectionWhere).toHaveBeenCalledWith(
      "ProductBadges",
      "productSlug",
      "kingston",
      1,
    );
  });

  it("accepts the 4 documented ProductBadgeType values", async () => {
    queryCollectionWhere.mockResolvedValueOnce([
      {
        productSlug: "k",
        badges: ["New", "Bestseller", "Sale", "CF+ Exclusive"],
      },
    ]);
    expect(await getProductBadges("k")).toEqual([
      "New",
      "Bestseller",
      "Sale",
      "CF+ Exclusive",
    ]);
  });
});

describe("listAllProductBadges (PLP)", () => {
  it("returns a Map keyed by productSlug → parsed badges", async () => {
    listCollectionItems.mockResolvedValueOnce([
      { productSlug: "a", badges: ["New"] },
      { productSlug: "b", badges: ["Sale", "Bestseller"] },
    ]);

    const out = await listAllProductBadges();
    expect(out).toBeInstanceOf(Map);
    expect(out.get("a")).toEqual(["New"]);
    expect(out.get("b")).toEqual(["Sale", "Bestseller"]);
    expect(out.size).toBe(2);
  });

  it("skips rows missing productSlug (silent — pinned so future callers know)", async () => {
    listCollectionItems.mockResolvedValueOnce([
      { productSlug: "a", badges: ["New"] },
      { badges: ["Sale"] }, // no slug — skipped
      { productSlug: "", badges: ["Bestseller"] }, // empty slug — skipped (falsy)
      { productSlug: "c", badges: ["Sale"] },
    ]);

    const out = await listAllProductBadges();
    expect(out.size).toBe(2);
    expect(out.has("a")).toBe(true);
    expect(out.has("c")).toBe(true);
  });

  it("returns an empty Map AND logs the failure when Wix throws", async () => {
    listCollectionItems.mockRejectedValueOnce(new Error("wix down"));

    const out = await listAllProductBadges();
    expect(out).toBeInstanceOf(Map);
    expect(out.size).toBe(0);
    expect(logWixFailure).toHaveBeenCalledWith(
      "wix-cms",
      "listAllProductBadges",
      expect.any(Error),
    );
  });

  it("filters invalid badge values per row (uppercase legacy, typos, non-strings)", async () => {
    listCollectionItems.mockResolvedValueOnce([
      {
        productSlug: "kingston",
        badges: ["New", "BESTSELLER", "Sale", "InvalidBadge", 99],
      },
    ]);

    const out = await listAllProductBadges();
    expect(out.get("kingston")).toEqual(["New", "Sale"]);
  });

  it("returns Map with empty array entries for rows that have an invalid 'badges' field shape", async () => {
    listCollectionItems.mockResolvedValueOnce([
      { productSlug: "x", badges: "Sale" }, // string instead of array
    ]);

    const out = await listAllProductBadges();
    expect(out.get("x")).toEqual([]);
  });

  it("queries the ProductBadges collection with limit 500", async () => {
    listCollectionItems.mockResolvedValueOnce([]);
    await listAllProductBadges();
    expect(listCollectionItems).toHaveBeenCalledWith("ProductBadges", 500);
  });
});
