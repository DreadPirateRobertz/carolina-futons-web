// cfw-logger migration: the PDP page's non-HTTPS image-URL check
// (inside generateMetadata) routes through logError. This is a
// best-effort observability hook — the OG image still falls back to
// DEFAULT_OG_IMAGE either way. New dedicated test file pins the logger
// contract; the page itself has no other dedicated test (coverage of
// the metadata path is implicit via the build).

import { describe, it, expect, vi, beforeEach } from "vitest";

const logErrorMock = vi.fn();
vi.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => logErrorMock(...args),
}));

const getProductBySlugMock = vi.fn();
vi.mock("@/lib/wix/products", () => ({
  getProductBySlug: (...args: unknown[]) => getProductBySlugMock(...args),
  listAllProducts: async () => [],
}));

// Heavy downstream imports we don't exercise from generateMetadata.
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/product/PdpInteractive", () => ({
  PdpInteractive: () => null,
}));
vi.mock("@/lib/product/build-gallery", () => ({ buildGallery: () => [] }));
vi.mock("@/components/product/PdpComfortBand", () => ({
  PdpComfortBand: () => null,
}));
vi.mock("@/components/product/PdpCrossSell", () => ({
  PdpCrossSell: () => null,
}));
vi.mock("@/components/product/PdpMattressBundle", () => ({
  PdpMattressBundle: () => null,
}));

beforeEach(() => {
  logErrorMock.mockReset();
  getProductBySlugMock.mockReset();
});

function productWithImage(url: string | undefined) {
  return {
    _id: "p-1",
    slug: "kingston",
    name: "Kingston Frame",
    description: "Hardwood frame.",
    media: url ? { mainMedia: { image: { url } } } : undefined,
  };
}

describe("PDP generateMetadata — logError on non-HTTPS image URL", () => {
  it("calls logError when the product's mainMedia URL is wix:image:// (non-HTTPS)", async () => {
    getProductBySlugMock.mockResolvedValueOnce(
      productWithImage("wix:image://v1/abc.jpg"),
    );
    const { generateMetadata } = await import("@/app/products/[slug]/page");
    await generateMetadata({ params: Promise.resolve({ slug: "kingston" }) });
    expect(logErrorMock).toHaveBeenCalledWith(
      "pdp",
      "non-HTTPS product image URL",
      { slug: "kingston", mainImageUrl: "wix:image://v1/abc.jpg" },
    );
  });

  it("does NOT call logError when the mainMedia URL is HTTPS (happy path)", async () => {
    getProductBySlugMock.mockResolvedValueOnce(
      productWithImage("https://static.wixstatic.com/media/abc.jpg"),
    );
    const { generateMetadata } = await import("@/app/products/[slug]/page");
    await generateMetadata({ params: Promise.resolve({ slug: "kingston" }) });
    expect(logErrorMock).not.toHaveBeenCalled();
  });

  it("does NOT call logError when the product has no mainMedia URL (nothing to flag)", async () => {
    getProductBySlugMock.mockResolvedValueOnce(productWithImage(undefined));
    const { generateMetadata } = await import("@/app/products/[slug]/page");
    await generateMetadata({ params: Promise.resolve({ slug: "kingston" }) });
    expect(logErrorMock).not.toHaveBeenCalled();
  });
});
