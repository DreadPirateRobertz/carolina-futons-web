// cfw-sej: unit tests for src/lib/admin/revalidate.ts.
// Tests use vi.resetModules() + dynamic import() per test so each test
// starts with a fresh module instance (zeroed debounce timestamp).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

beforeEach(() => {
  vi.resetModules();
  mockRevalidateTag.mockReset();
  mockRevalidatePath.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("invalidateSiteContent", () => {
  it("calls revalidateTag with site-content tag and 'default' type", async () => {
    const { invalidateSiteContent } = await import("@/lib/admin/revalidate");
    invalidateSiteContent();
    expect(mockRevalidateTag).toHaveBeenCalledWith("site-content", "default");
    expect(mockRevalidateTag).toHaveBeenCalledTimes(1);
  });

  it("debounces: second call within 1s skips revalidateTag", async () => {
    const { invalidateSiteContent } = await import("@/lib/admin/revalidate");
    invalidateSiteContent();
    invalidateSiteContent();
    expect(mockRevalidateTag).toHaveBeenCalledTimes(1);
  });

  it("fires again after 1s has elapsed", async () => {
    vi.useFakeTimers();
    const { invalidateSiteContent } = await import("@/lib/admin/revalidate");
    invalidateSiteContent();
    expect(mockRevalidateTag).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1001);
    invalidateSiteContent();
    expect(mockRevalidateTag).toHaveBeenCalledTimes(2);
  });

  it("still debounces at 999ms (boundary: not yet elapsed)", async () => {
    vi.useFakeTimers();
    const { invalidateSiteContent } = await import("@/lib/admin/revalidate");
    invalidateSiteContent();
    vi.advanceTimersByTime(999);
    invalidateSiteContent();
    expect(mockRevalidateTag).toHaveBeenCalledTimes(1);
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

  it("is not debounced — each productId fires independently", async () => {
    const { invalidateImage } = await import("@/lib/admin/revalidate");
    invalidateImage("p1");
    invalidateImage("p1");
    // revalidateTag called twice (no debounce for images)
    expect(mockRevalidateTag).toHaveBeenCalledTimes(2);
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
});
