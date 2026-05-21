// cfw-sej: unit tests for src/lib/admin/revalidate.ts.
// Tests use vi.resetModules() + dynamic import() per test so each test
// starts with a fresh module instance.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockRevalidateTag = vi.fn();
const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("@/lib/cms/site-content", () => ({
  SITE_CONTENT_CACHE_TAG: "site-content",
}));

const mockLogError = vi.fn();
vi.mock("@/lib/observability/log", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

beforeEach(() => {
  vi.resetModules();
  mockRevalidateTag.mockReset();
  mockRevalidatePath.mockReset();
  mockLogError.mockReset();
});

describe("invalidateSiteContent", () => {
  it("calls revalidateTag with site-content tag and 'default' type", async () => {
    const { invalidateSiteContent } = await import("@/lib/admin/revalidate");
    invalidateSiteContent();
    expect(mockRevalidateTag).toHaveBeenCalledWith("site-content", "default");
    expect(mockRevalidateTag).toHaveBeenCalledTimes(1);
  });

  it("calls revalidateTag on every invocation (no debounce)", async () => {
    const { invalidateSiteContent } = await import("@/lib/admin/revalidate");
    invalidateSiteContent();
    invalidateSiteContent();
    expect(mockRevalidateTag).toHaveBeenCalledTimes(2);
  });

  it("swallows a revalidateTag throw and logs the error", async () => {
    mockRevalidateTag.mockImplementation(() => {
      throw new Error("Next.js cache invariant violated");
    });
    const { invalidateSiteContent } = await import("@/lib/admin/revalidate");
    expect(() => invalidateSiteContent()).not.toThrow();
    expect(mockLogError).toHaveBeenCalledWith(
      "admin/revalidate",
      "invalidateSiteContent failed",
      expect.any(Error),
    );
  });
});

describe("invalidateImage", () => {
  it("calls revalidateTag with product-{productId} tag", async () => {
    const { invalidateImage } = await import("@/lib/admin/revalidate");
    invalidateImage("abc-123");
    expect(mockRevalidateTag).toHaveBeenCalledWith("product-abc-123", "default");
  });

  it("calls revalidatePath for /products page", async () => {
    const { invalidateImage } = await import("@/lib/admin/revalidate");
    invalidateImage("abc-123");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/products", "page");
  });

  it("calls both tag and path on each invocation (no debounce)", async () => {
    const { invalidateImage } = await import("@/lib/admin/revalidate");
    invalidateImage("p1");
    invalidateImage("p1");
    expect(mockRevalidateTag).toHaveBeenCalledTimes(2);
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("swallows a throw and logs the error", async () => {
    mockRevalidateTag.mockImplementation(() => {
      throw new Error("cache error");
    });
    const { invalidateImage } = await import("@/lib/admin/revalidate");
    expect(() => invalidateImage("prod-1")).not.toThrow();
    expect(mockLogError).toHaveBeenCalledWith(
      "admin/revalidate",
      "invalidateImage failed",
      expect.any(Error),
    );
  });
});

describe("invalidateGuide", () => {
  it("calls revalidateTag with guide-{slug} tag", async () => {
    const { invalidateGuide } = await import("@/lib/admin/revalidate");
    invalidateGuide("the-best-futon");
    expect(mockRevalidateTag).toHaveBeenCalledWith("guide-the-best-futon", "default");
  });

  it("handles slugs with hyphens", async () => {
    const { invalidateGuide } = await import("@/lib/admin/revalidate");
    invalidateGuide("how-to-choose-a-futon-frame");
    expect(mockRevalidateTag).toHaveBeenCalledWith(
      "guide-how-to-choose-a-futon-frame",
      "default",
    );
  });

  it("does not call revalidatePath (tag-only invalidation)", async () => {
    const { invalidateGuide } = await import("@/lib/admin/revalidate");
    invalidateGuide("some-guide");
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("swallows a throw and logs the error", async () => {
    mockRevalidateTag.mockImplementation(() => {
      throw new Error("cache error");
    });
    const { invalidateGuide } = await import("@/lib/admin/revalidate");
    expect(() => invalidateGuide("my-guide")).not.toThrow();
    expect(mockLogError).toHaveBeenCalledWith(
      "admin/revalidate",
      "invalidateGuide failed",
      expect.any(Error),
    );
  });
});
