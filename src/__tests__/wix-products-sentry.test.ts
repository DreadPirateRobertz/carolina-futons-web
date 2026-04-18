import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  init: vi.fn(),
}));

vi.mock("@/lib/wix-client", () => ({
  getWixClient: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { getWixClient } from "@/lib/wix-client";
import {
  listProducts,
  getProductBySlug,
  getCollectionBySlug,
  listProductsByCollectionId,
  listCollections,
} from "@/lib/wix/products";

const mockClient = {
  products: {
    queryProducts: vi.fn(),
  },
  collections: {
    getCollectionBySlug: vi.fn(),
    queryCollections: vi.fn(),
  },
};

const captureException = vi.mocked(Sentry.captureException);
const getWixClientMock = vi.mocked(getWixClient);

beforeEach(() => {
  vi.clearAllMocks();
  getWixClientMock.mockReturnValue(mockClient as never);
});

describe("logWixFailure Sentry wiring", () => {
  it("calls captureException when listProducts throws", async () => {
    const err = new Error("Wix SDK timeout");
    mockClient.products.queryProducts.mockReturnValue({
      limit: () => ({ find: () => Promise.reject(err) }),
    });

    const result = await listProducts();

    expect(result).toEqual([]);
    expect(captureException).toHaveBeenCalledOnce();
    expect(captureException).toHaveBeenCalledWith(err, {
      extra: { op: "listProducts", code: undefined },
    });
  });

  it("calls captureException when getProductBySlug throws", async () => {
    const err = new Error("not found");
    mockClient.products.queryProducts.mockReturnValue({
      eq: () => ({ limit: () => ({ find: () => Promise.reject(err) }) }),
    });

    const result = await getProductBySlug("futon-frames");

    expect(result).toBeNull();
    expect(captureException).toHaveBeenCalledOnce();
    expect(captureException).toHaveBeenCalledWith(err, {
      extra: { op: "getProductBySlug(futon-frames)", code: undefined },
    });
  });

  it("includes Wix error code in extra when present", async () => {
    const err = Object.assign(new Error("auth error"), { code: "UNAUTHORIZED" });
    mockClient.products.queryProducts.mockReturnValue({
      limit: () => ({ find: () => Promise.reject(err) }),
    });

    await listProducts();

    expect(captureException).toHaveBeenCalledWith(err, {
      extra: { op: "listProducts", code: "UNAUTHORIZED" },
    });
  });

  it("calls captureException when getCollectionBySlug throws", async () => {
    const err = new Error("collection missing");
    mockClient.collections.getCollectionBySlug.mockRejectedValue(err);

    const result = await getCollectionBySlug("futon-frames");

    expect(result).toBeNull();
    expect(captureException).toHaveBeenCalledOnce();
  });

  it("calls captureException when listProductsByCollectionId throws", async () => {
    const err = new Error("query error");
    mockClient.products.queryProducts.mockReturnValue({
      hasSome: () => ({ limit: () => ({ find: () => Promise.reject(err) }) }),
    });

    const result = await listProductsByCollectionId("col-123");

    expect(result).toEqual([]);
    expect(captureException).toHaveBeenCalledOnce();
  });

  it("calls captureException when listCollections throws", async () => {
    const err = new Error("collections unavailable");
    mockClient.collections.queryCollections.mockReturnValue({
      limit: () => ({ find: () => Promise.reject(err) }),
    });

    const result = await listCollections();

    expect(result).toEqual([]);
    expect(captureException).toHaveBeenCalledOnce();
  });

  it("still logs to console.error alongside captureException", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("sdk failure");
    mockClient.products.queryProducts.mockReturnValue({
      limit: () => ({ find: () => Promise.reject(err) }),
    });

    await listProducts();

    expect(consoleSpy).toHaveBeenCalledOnce();
    expect(captureException).toHaveBeenCalledOnce();
    consoleSpy.mockRestore();
  });
});
