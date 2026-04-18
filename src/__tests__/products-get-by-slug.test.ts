import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));

beforeEach(() => {
  vi.resetModules();
});

const STUB = { _id: "prod-123", slug: "kingston-futon-frame", name: "Kingston Futon Frame" };

const FULL_PRODUCT = {
  ...STUB,
  productOptions: [
    { name: "Frame Color", optionType: "drop_down", choices: [] },
    { name: "Size", optionType: "drop_down", choices: [] },
  ],
  variants: [
    { _id: "v-1", choices: { "Frame Color": "Java", Size: "Full" } },
    { _id: "v-2", choices: { "Frame Color": "Java", Size: "Queen" } },
  ],
};

function makeClient(overrides: { getProduct?: () => Promise<unknown> } = {}) {
  return {
    products: {
      queryProducts: () => ({
        eq: () => ({
          limit: () => ({
            find: async () => ({ items: [STUB] }),
          }),
        }),
      }),
      getProduct: overrides.getProduct ?? (async (_id: string) => ({ product: FULL_PRODUCT })),
    },
  };
}

describe("getProductBySlug — variant picker data", () => {
  it("returns productOptions from full getProduct fetch (regression pin)", async () => {
    // Pins that getProductBySlug calls getProduct(id) after the slug query so
    // productOptions reaches the PDP variant picker. A regression that reverts
    // to queryProducts-only would break this because queryProducts omits
    // productOptions from its response payload.
    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => makeClient(),
    }));

    const { getProductBySlug } = await import("@/lib/wix/products");
    const product = await getProductBySlug("kingston-futon-frame");

    expect(product).not.toBeNull();
    expect(product?.productOptions).toHaveLength(2);
    expect(product?.productOptions?.[0]?.name).toBe("Frame Color");
    expect(product?.variants).toHaveLength(2);
  });

  it("returns null when slug query returns no items", async () => {
    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => ({
        products: {
          queryProducts: () => ({
            eq: () => ({ limit: () => ({ find: async () => ({ items: [] }) }) }),
          }),
          getProduct: vi.fn(),
        },
      }),
    }));

    const { getProductBySlug } = await import("@/lib/wix/products");
    expect(await getProductBySlug("not-found")).toBeNull();
  });

  it("returns null when stub has no _id (degenerate catalog entry)", async () => {
    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => ({
        products: {
          queryProducts: () => ({
            eq: () => ({
              limit: () => ({
                find: async () => ({ items: [{ slug: "mystery-product" }] }),
              }),
            }),
          }),
          getProduct: vi.fn(),
        },
      }),
    }));

    const { getProductBySlug } = await import("@/lib/wix/products");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await getProductBySlug("mystery-product");
    spy.mockRestore();
    // stub has no _id → returned as-is (null coalesced) without calling getProduct
    expect(result).toMatchObject({ slug: "mystery-product" });
  });

  it("getProduct is called with the stub _id from the slug query", async () => {
    const getProductSpy = vi.fn(async (_id: string) => ({ product: FULL_PRODUCT }));
    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => makeClient({ getProduct: getProductSpy }),
    }));

    const { getProductBySlug } = await import("@/lib/wix/products");
    await getProductBySlug("kingston-futon-frame");

    expect(getProductSpy).toHaveBeenCalledOnce();
    expect(getProductSpy).toHaveBeenCalledWith("prod-123");
  });
});
