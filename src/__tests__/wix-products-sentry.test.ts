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

function wixError(message: string, code?: string | number) {
  return Object.assign(new Error(message), { code });
}

beforeEach(() => {
  vi.clearAllMocks();
  getWixClientMock.mockReturnValue(mockClient as never);
});

describe("logWixFailure Sentry wiring", () => {
  it("calls captureException when listProducts throws a Wix error", async () => {
    const err = wixError("Wix SDK timeout", "TIMEOUT");
    mockClient.products.queryProducts.mockReturnValue({
      limit: () => ({ find: () => Promise.reject(err) }),
    });

    const result = await listProducts();

    expect(result).toEqual([]);
    expect(captureException).toHaveBeenCalledOnce();
    expect(captureException).toHaveBeenCalledWith(err, {
      extra: { op: "listProducts", code: "TIMEOUT" },
    });
  });

  it("calls captureException when getProductBySlug throws a Wix error", async () => {
    const err = wixError("not found", 404);
    mockClient.products.queryProducts.mockReturnValue({
      eq: () => ({ limit: () => ({ find: () => Promise.reject(err) }) }),
    });

    const result = await getProductBySlug("futon-frames");

    expect(result).toBeNull();
    expect(captureException).toHaveBeenCalledOnce();
    expect(captureException).toHaveBeenCalledWith(err, {
      extra: { op: "getProductBySlug(futon-frames)", code: 404 },
    });
  });

  it("calls captureException when getCollectionBySlug throws a Wix error", async () => {
    const err = wixError("collection missing", "NOT_FOUND");
    mockClient.collections.getCollectionBySlug.mockRejectedValue(err);

    const result = await getCollectionBySlug("futon-frames");

    expect(result).toBeNull();
    expect(captureException).toHaveBeenCalledWith(err, {
      extra: { op: "getCollectionBySlug(futon-frames)", code: "NOT_FOUND" },
    });
  });

  it("calls captureException when listProductsByCollectionId throws a Wix error", async () => {
    const err = wixError("query error", "RATE_LIMITED");
    mockClient.products.queryProducts.mockReturnValue({
      hasSome: () => ({ limit: () => ({ find: () => Promise.reject(err) }) }),
    });

    const result = await listProductsByCollectionId("col-123");

    expect(result).toEqual([]);
    expect(captureException).toHaveBeenCalledWith(err, {
      extra: { op: "listProductsByCollectionId(col-123)", code: "RATE_LIMITED" },
    });
  });

  it("calls captureException when listCollections throws a Wix error", async () => {
    const err = wixError("collections unavailable", 503);
    mockClient.collections.queryCollections.mockReturnValue({
      limit: () => ({ find: () => Promise.reject(err) }),
    });

    const result = await listCollections();

    expect(result).toEqual([]);
    expect(captureException).toHaveBeenCalledWith(err, {
      extra: { op: "listCollections", code: 503 },
    });
  });

  it("re-throws non-Wix errors (programming mistakes are not silently swallowed)", async () => {
    const err = new TypeError("Cannot read properties of undefined");
    mockClient.products.queryProducts.mockReturnValue({
      limit: () => ({ find: () => Promise.reject(err) }),
    });

    await expect(listProducts()).rejects.toThrow(TypeError);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("re-throws non-Wix errors in getCollectionBySlug", async () => {
    const err = new ReferenceError("slug is not defined");
    mockClient.collections.getCollectionBySlug.mockRejectedValue(err);

    await expect(getCollectionBySlug("test")).rejects.toThrow(ReferenceError);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("remains graceful when captureException itself throws", async () => {
    captureException.mockImplementationOnce(() => {
      throw new Error("Sentry transport failed");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = wixError("Wix SDK error", 500);
    mockClient.products.queryProducts.mockReturnValue({
      limit: () => ({ find: () => Promise.reject(err) }),
    });

    const result = await listProducts();

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });

  it("still logs to console.error alongside captureException", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = wixError("sdk failure", "SDK_FAILURE");
    mockClient.products.queryProducts.mockReturnValue({
      limit: () => ({ find: () => Promise.reject(err) }),
    });

    await listProducts();

    expect(consoleSpy).toHaveBeenCalledOnce();
    expect(captureException).toHaveBeenCalledOnce();
    consoleSpy.mockRestore();
  });

  it("treats FetchErrorResponse-shaped errors (with response) as Wix errors", async () => {
    const err = Object.assign(new Error("HTTP 503"), {
      response: new Response(null, { status: 503 }),
    });
    mockClient.products.queryProducts.mockReturnValue({
      limit: () => ({ find: () => Promise.reject(err) }),
    });

    const result = await listProducts();

    expect(result).toEqual([]);
    expect(captureException).toHaveBeenCalledOnce();
  });
});
