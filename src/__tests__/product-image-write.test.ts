import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Tokens } from "@wix/sdk";

// cfw-6qd.7: updateProductMainImage helper. Pins the SDK call shape
// (productId positional + media.mainMedia.image.url payload) and the
// fail-soft return contract.

const updateProductMock = vi.fn();
vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: () => ({
    products: { updateProduct: updateProductMock },
  }),
}));

const tokens: Tokens = {
  accessToken: { value: "a", expiresAt: 0 },
  refreshToken: {
    value: "r",
    role: "member" as Tokens["refreshToken"]["role"],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateProductMainImage", () => {
  it("calls products.updateProduct with media.mainMedia.image.url payload", async () => {
    updateProductMock.mockResolvedValue({ product: { _id: "p1" } });
    const { updateProductMainImage } = await import("@/lib/wix/product-image-write");
    const result = await updateProductMainImage(
      tokens,
      "p1",
      "https://static.wixstatic.com/media/abc.jpg",
    );
    expect(updateProductMock).toHaveBeenCalledWith("p1", {
      media: {
        mainMedia: {
          image: { url: "https://static.wixstatic.com/media/abc.jpg" },
        },
      },
    });
    expect(result).toEqual({
      ok: true,
      productId: "p1",
      imageUrl: "https://static.wixstatic.com/media/abc.jpg",
    });
  });

  it("fails-soft on Wix throw — returns ok:false with status", async () => {
    updateProductMock.mockRejectedValue(
      Object.assign(new Error("not found"), { status: 404 }),
    );
    const { updateProductMainImage } = await import("@/lib/wix/product-image-write");
    const result = await updateProductMainImage(tokens, "missing", "https://x");
    expect(result).toEqual({ ok: false, reason: "wix_error", status: 404 });
  });

  it("extracts status from response.status when error doesn't carry direct status", async () => {
    updateProductMock.mockRejectedValue({ response: { status: 500 } });
    const { updateProductMainImage } = await import("@/lib/wix/product-image-write");
    const result = await updateProductMainImage(tokens, "p", "https://x");
    expect(result).toEqual({ ok: false, reason: "wix_error", status: 500 });
  });
});
