import { describe, it, expect, vi, beforeEach } from "vitest";

const listAllProductSwatches = vi.fn();
vi.mock("@/lib/wix/product-swatches", () => ({
  listAllProductSwatches: (...args: unknown[]) =>
    listAllProductSwatches(...args),
}));

import { enrichProductsWithColorChoices } from "@/lib/product/enrich-colors";
import type { WixProduct } from "@/lib/wix/products";

function product(id: string, slug: string): WixProduct {
  return { _id: id, slug } as unknown as WixProduct;
}

beforeEach(() => {
  listAllProductSwatches.mockReset();
});

describe("enrichProductsWithColorChoices", () => {
  it("returns an empty map when given no products without calling the CMS", async () => {
    const map = await enrichProductsWithColorChoices([]);
    expect(map.size).toBe(0);
    expect(listAllProductSwatches).not.toHaveBeenCalled();
  });

  it("returns an empty map when the CMS returns no rows", async () => {
    listAllProductSwatches.mockResolvedValue(new Map());
    const map = await enrichProductsWithColorChoices([
      product("p1", "rio-futon"),
    ]);
    expect(map.size).toBe(0);
  });

  it("issues exactly ONE batch CMS call regardless of product count", async () => {
    listAllProductSwatches.mockResolvedValue(new Map());
    await enrichProductsWithColorChoices([
      product("p1", "rio"),
      product("p2", "mesa"),
      product("p3", "kingston"),
      product("p4", "monterey"),
      product("p5", "asheville"),
    ]);
    expect(listAllProductSwatches).toHaveBeenCalledTimes(1);
  });

  it("maps slug→swatches CMS rows onto productId keys", async () => {
    listAllProductSwatches.mockResolvedValue(
      new Map([
        [
          "rio-futon",
          [
            { name: "Slate", hex: "#5A5F66" },
            { name: "Sand", hex: "#D9C9A6" },
          ],
        ],
        ["mesa-mattress", [{ name: "Cream", hex: "#F4E9D6" }]],
      ]),
    );
    const map = await enrichProductsWithColorChoices([
      product("rio-id", "rio-futon"),
      product("mesa-id", "mesa-mattress"),
    ]);
    expect(map.get("rio-id")).toEqual([
      { label: "Slate", hex: "#5A5F66" },
      { label: "Sand", hex: "#D9C9A6" },
    ]);
    expect(map.get("mesa-id")).toEqual([
      { label: "Cream", hex: "#F4E9D6" },
    ]);
  });

  it("skips products with no matching CMS row", async () => {
    listAllProductSwatches.mockResolvedValue(
      new Map([["rio-futon", [{ name: "Slate", hex: "#5A5F66" }]]]),
    );
    const map = await enrichProductsWithColorChoices([
      product("rio-id", "rio-futon"),
      product("unknown-id", "no-such-slug"),
    ]);
    expect(map.has("rio-id")).toBe(true);
    expect(map.has("unknown-id")).toBe(false);
  });

  it("skips products missing _id or slug", async () => {
    listAllProductSwatches.mockResolvedValue(
      new Map([["rio-futon", [{ name: "Slate", hex: "#5A5F66" }]]]),
    );
    const map = await enrichProductsWithColorChoices([
      { slug: "rio-futon" } as WixProduct,
      { _id: "no-slug-id" } as WixProduct,
      product("rio-id", "rio-futon"),
    ]);
    expect(map.size).toBe(1);
    expect(map.get("rio-id")).toBeDefined();
  });

  it("skips products whose CMS row has an empty swatches array", async () => {
    listAllProductSwatches.mockResolvedValue(
      new Map<string, Array<{ name: string; hex: string }>>([
        ["empty-row", []],
        ["good-row", [{ name: "Slate", hex: "#5A5F66" }]],
      ]),
    );
    const map = await enrichProductsWithColorChoices([
      product("empty-id", "empty-row"),
      product("good-id", "good-row"),
    ]);
    expect(map.has("empty-id")).toBe(false);
    expect(map.get("good-id")).toEqual([
      { label: "Slate", hex: "#5A5F66" },
    ]);
  });
});
