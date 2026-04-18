import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

const sentryMock = vi.hoisted(() => ({
  captureException: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => sentryMock);

function brokenClient() {
  return {
    products: {
      queryProducts: () => ({
        eq: () => ({
          limit: () => ({
            find: async () => {
              throw new Error("Wix SDK boom");
            },
          }),
        }),
        limit: () => ({
          find: async () => {
            throw new Error("Wix SDK boom");
          },
        }),
      }),
    },
    collections: {
      getCollectionBySlug: async () => {
        throw new Error("Wix SDK boom");
      },
      queryCollections: () => ({
        limit: () => ({
          find: async () => {
            throw new Error("Wix SDK boom");
          },
        }),
      }),
    },
  };
}

describe("logWixFailure forwards to Sentry", () => {
  beforeEach(() => {
    sentryMock.captureException.mockClear();
  });

  it("captureException tagged with source=wix and the op", async () => {
    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => brokenClient(),
    }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { listProducts, getProductBySlug, listCollections } = await import(
      "@/lib/wix/products"
    );

    await listProducts();
    await getProductBySlug("x");
    await listCollections();

    const calls = sentryMock.captureException.mock.calls;
    expect(calls).toHaveLength(3);

    const tags = calls.map(([, ctx]) => (ctx as { tags?: Record<string, string> }).tags);
    expect(tags[0]).toMatchObject({ source: "wix", op: "listProducts" });
    expect(tags[1]).toMatchObject({ source: "wix", op: "getProductBySlug(x)" });
    expect(tags[2]).toMatchObject({ source: "wix", op: "listCollections" });
  });
});
