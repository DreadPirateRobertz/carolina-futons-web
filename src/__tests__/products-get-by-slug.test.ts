import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const sentryMock = vi.hoisted(() => ({
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));

vi.mock("@sentry/nextjs", () => sentryMock);

beforeEach(() => {
  vi.resetModules();
  sentryMock.captureException.mockClear();
  sentryMock.flush.mockClear();
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

function makeClient(overrides: { getProduct?: (_id: string) => Promise<unknown> } = {}) {
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

  it("returns null and fires Sentry when stub has no _id (malformed catalog entry)", async () => {
    const getProductSpy = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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
          getProduct: getProductSpy,
        },
      }),
    }));

    const { getProductBySlug } = await import("@/lib/wix/products");
    const result = await getProductBySlug("mystery-product");
    consoleSpy.mockRestore();
    // stub has no _id → null return + Sentry event (not a silent failure)
    expect(result).toBeNull();
    expect(getProductSpy).not.toHaveBeenCalled();
    expect(sentryMock.captureException).toHaveBeenCalledOnce();
  });

  it("returns null and fires Sentry when getProduct envelope has no product field", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => makeClient({ getProduct: async () => ({}) }),
    }));

    const { getProductBySlug } = await import("@/lib/wix/products");
    const result = await getProductBySlug("kingston-futon-frame");
    consoleSpy.mockRestore();
    expect(result).toBeNull();
    expect(sentryMock.captureException).toHaveBeenCalledOnce();
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
