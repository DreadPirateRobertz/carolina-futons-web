import { describe, it, expect, vi, beforeEach } from "vitest";

import { isFutonFrame, getMesaMattresses } from "@/lib/product/mattress-bundle";

// cf-h1i4: mattress-bundle utility unit tests

vi.mock("@/lib/wix/products", () => ({
  getProductBySlug: vi.fn(),
}));

vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: vi.fn().mockResolvedValue(undefined),
}));

import { getProductBySlug } from "@/lib/wix/products";

const mockGetProductBySlug = vi.mocked(getProductBySlug);

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    _id: "prod-abc",
    name: "Mesa 1000 Mattress",
    priceData: { price: 299 },
    media: { mainMedia: { image: { url: "https://example.com/img.jpg" } } },
    ...overrides,
  };
}

describe("isFutonFrame", () => {
  it("returns true for slugs ending with -futon-frame", () => {
    expect(isFutonFrame("kingston-futon-frame")).toBe(true);
    expect(isFutonFrame("cambridge-futon-frame")).toBe(true);
  });

  it("returns false for futon-cover and futon-mattress slugs (false-positive guard)", () => {
    expect(isFutonFrame("coastal-futon-cover")).toBe(false);
    expect(isFutonFrame("my-futon")).toBe(false);
    expect(isFutonFrame("futon-frame-something")).toBe(false);
  });

  it("returns false for non-futon slugs", () => {
    expect(isFutonFrame("mesa-1000-mattress")).toBe(false);
    expect(isFutonFrame("kingston-platform-bed")).toBe(false);
    expect(isFutonFrame("murphy-cabinet-bed")).toBe(false);
  });
});

describe("getMesaMattresses", () => {
  beforeEach(() => {
    mockGetProductBySlug.mockReset();
  });

  it("returns all three mattresses when all slugs resolve", async () => {
    mockGetProductBySlug
      .mockResolvedValueOnce(makeProduct({ _id: "p1", name: "Mesa 1000 Mattress", priceData: { price: 299 } }))
      .mockResolvedValueOnce(makeProduct({ _id: "p2", name: "Mesa 3000 Mattress", priceData: { price: 399 } }))
      .mockResolvedValueOnce(makeProduct({ _id: "p3", name: "Mesa 5000 Mattress", priceData: { price: 499 } }));

    const result = await getMesaMattresses();
    expect(result.error).toBeUndefined();
    expect(result.items).toHaveLength(3);
    expect(result.items[0].id).toBe("p1");
    expect(result.items[1].id).toBe("p2");
    expect(result.items[2].id).toBe("p3");
  });

  it("omits products that return null without setting error (partial failure)", async () => {
    mockGetProductBySlug
      .mockResolvedValueOnce(makeProduct({ _id: "p1", name: "Mesa 1000 Mattress" }))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeProduct({ _id: "p3", name: "Mesa 5000 Mattress" }));

    const result = await getMesaMattresses();
    expect(result.error).toBeUndefined();
    expect(result.items).toHaveLength(2);
    expect(result.items.map((m) => m.id)).toEqual(["p1", "p3"]);
  });

  it("returns { items: [], error: 'wix_sdk' } when all fetches reject", async () => {
    mockGetProductBySlug.mockRejectedValue(new Error("Wix SDK error"));

    const result = await getMesaMattresses();
    expect(result.items).toHaveLength(0);
    expect(result.error).toBe("wix_sdk");
  });

  it("omits products missing _id or name", async () => {
    mockGetProductBySlug
      .mockResolvedValueOnce(makeProduct({ _id: null }))
      .mockResolvedValueOnce(makeProduct({ name: null }))
      .mockResolvedValueOnce(makeProduct({ _id: "p3", name: "Mesa 5000 Mattress" }));

    const result = await getMesaMattresses();
    expect(result.error).toBeUndefined();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("p3");
  });

  it("strips non-HTTPS image URLs", async () => {
    mockGetProductBySlug.mockResolvedValue(
      makeProduct({
        _id: "p1",
        name: "Mesa 1000 Mattress",
        media: { mainMedia: { image: { url: "wix:image://v1/abc.jpg/abc.jpg#originWidth=800" } } },
      }),
    );

    const result = await getMesaMattresses();
    expect(result.items[0].imageUrl).toBeUndefined();
  });

  it("keeps HTTPS image URLs", async () => {
    mockGetProductBySlug.mockResolvedValue(
      makeProduct({ _id: "p1", name: "Mesa 1000 Mattress" }),
    );

    const result = await getMesaMattresses();
    expect(result.items[0].imageUrl).toBe("https://example.com/img.jpg");
  });

  it("sets unitPriceCents from priceData.price", async () => {
    mockGetProductBySlug.mockResolvedValue(
      makeProduct({ _id: "p1", name: "Mesa 1000 Mattress", priceData: { price: 299.99 } }),
    );

    const result = await getMesaMattresses();
    expect(result.items[0].unitPriceCents).toBe(29999);
  });
});
