import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

const sentryMock = vi.hoisted(() => ({
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));

vi.mock("@sentry/nextjs", () => sentryMock);

type ThrownShape = unknown;

function clientThatThrows(thrown: ThrownShape) {
  return {
    products: {
      queryProducts: () => ({
        eq: () => ({
          limit: () => ({
            find: async () => {
              throw thrown;
            },
          }),
        }),
        limit: () => ({
          find: async () => {
            throw thrown;
          },
        }),
      }),
      getProduct: async () => {
        throw thrown;
      },
    },
    collections: {
      getCollectionBySlug: async () => {
        throw thrown;
      },
      queryCollections: () => ({
        limit: () => ({
          find: async () => {
            throw thrown;
          },
        }),
      }),
    },
  };
}

describe("logWixFailure", () => {
  beforeEach(() => {
    sentryMock.captureException.mockClear();
    sentryMock.flush.mockClear();
  });

  it("tags known Wix SDK errors as kind=wix-sdk, level=warning", async () => {
    const wixError = {
      message: "OAuth token refresh failed",
      code: "AUTH_ERROR",
      details: { applicationError: { code: "AUTH_ERROR" } },
      response: { status: 401 },
    };
    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => clientThatThrows(wixError),
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
    for (const [, ctx] of calls) {
      const c = ctx as { tags?: Record<string, string>; level?: string };
      expect(c.tags).toMatchObject({ source: "wix", kind: "wix-sdk" });
      expect(c.level).toBe("warning");
    }
    const ops = calls.map(
      ([, ctx]) => (ctx as { tags: Record<string, string> }).tags.op,
    );
    expect(ops).toEqual([
      "listProducts",
      "getProductBySlug(x)",
      "listCollections",
    ]);
  });

  it("tags unexpected errors as kind=unexpected, level=error", async () => {
    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => clientThatThrows(new TypeError("null is not a function")),
    }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { listProducts } = await import("@/lib/wix/products");
    const result = await listProducts();

    expect(result).toEqual([]);
    expect(sentryMock.captureException).toHaveBeenCalledTimes(1);
    const call = sentryMock.captureException.mock.calls[0];
    const c = call[1] as { tags: Record<string, string>; level: string };
    expect(c.tags).toMatchObject({ source: "wix", kind: "unexpected" });
    expect(c.level).toBe("error");
  });

  it("still returns empty shapes (no 500s) on either kind", async () => {
    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => clientThatThrows(new TypeError("boom")),
    }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { listProducts, getProductBySlug, getCollectionBySlug } = await import(
      "@/lib/wix/products"
    );

    expect(await listProducts()).toEqual([]);
    expect(await getProductBySlug("x")).toBeNull();
    expect(await getCollectionBySlug("y")).toBeNull();
  });

  it("awaits Sentry.flush after captureException so serverless handlers ship the event", async () => {
    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () =>
        clientThatThrows({
          message: "boom",
          code: "FLAKY",
          response: { status: 500 },
        }),
    }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const order: string[] = [];
    sentryMock.captureException.mockImplementation(() => {
      order.push("capture");
    });
    sentryMock.flush.mockImplementation(async () => {
      order.push("flush");
      return true;
    });

    const { listProducts } = await import("@/lib/wix/products");
    await listProducts();

    expect(sentryMock.captureException).toHaveBeenCalledTimes(1);
    expect(sentryMock.flush).toHaveBeenCalledWith(2000);
    expect(order).toEqual(["capture", "flush"]);
  });
});
