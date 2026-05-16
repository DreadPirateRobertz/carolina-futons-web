// cfw-n51h: coverage for the non-HTTPS product image URL diagnostic
// in src/app/products/[slug]/page.tsx generateMetadata. Wix's CMS
// occasionally returns wix:image:// or other non-HTTPS URIs for
// products whose media upload is still processing — those crash
// social-card unfurls silently. The PDP falls back to DEFAULT_OG_IMAGE
// and logs an assertion-style diagnostic so ops can track which
// products have stale Wix media. Pre-migration the diagnostic only
// hit Vercel stdout; logError routes it through Sentry with the slug
// + URL in `extra` so dashboards can filter by product.

import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));

const sentryCaptureException = vi.fn();
const sentryFlush = vi.fn().mockResolvedValue(true);
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
  flush: (timeoutMs?: number) => sentryFlush(timeoutMs),
}));

const getProductBySlug = vi.fn();
vi.mock("@/lib/wix/products", () => ({
  getProductBySlug: (slug: string) => getProductBySlug(slug),
  getCollectionBySlug: vi.fn(),
  listAllProducts: vi.fn(),
}));

// Mock the seo/json-ld resolveSiteUrl helper — generateMetadata calls
// it for the canonical link but doesn't need a real URL for the
// diagnostic we're testing.
vi.mock("@/lib/seo/json-ld", () => ({
  resolveSiteUrl: () => "https://carolinafutons.com",
  buildBreadcrumbSchema: vi.fn(),
  buildProductSchema: vi.fn(),
}));

// Stub the React component imports — generateMetadata doesn't render
// them, but their module loading still happens.
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/product/PdpInteractive", () => ({ PdpInteractive: () => null }));
vi.mock("@/components/product/PdpComfortBand", () => ({ PdpComfortBand: () => null }));
vi.mock("@/components/product/PdpCrossSell", () => ({ PdpCrossSell: () => null }));
vi.mock("@/components/product/PdpMattressBundle", () => ({ PdpMattressBundle: () => null }));
vi.mock("@/components/product/PdpRecentlyViewed", () => ({ PdpRecentlyViewed: () => null }));
vi.mock("@/components/product/ShowroomCta", () => ({ ShowroomCta: () => null }));
vi.mock("@/components/product/PdpReviews", () => ({
  PdpReviews: () => null,
  pickPdpReviews: vi.fn(() => []),
}));
vi.mock("@/components/product/CustomerVideoReviewGrid", () => ({
  CustomerVideoReviewGrid: () => null,
}));
vi.mock("@/components/product/PdpShareButtons", () => ({ PdpShareButtons: () => null }));
vi.mock("@/components/product/PdpViewItemTracker", () => ({ PdpViewItemTracker: () => null }));
vi.mock("@/components/product/PdpProductVideo", () => ({ PdpProductVideo: () => null }));
vi.mock("@/components/product/PdpSizeGuide", () => ({ PdpSizeGuide: () => null }));
vi.mock("@/components/product/PdpWarrantyInfo", () => ({ PdpWarrantyInfo: () => null }));
vi.mock("@/components/product/ProductInfoModal", () => ({ ProductInfoModal: () => null }));
vi.mock("@/components/product/PdpAlsoBought", () => ({ PdpAlsoBought: () => null }));
vi.mock("@/components/seo/JsonLd", () => ({ JsonLd: () => null }));

// Light-weight stubs for the helpers generateMetadata DOES NOT call
// but page module loading evaluates.
vi.mock("@/lib/product/build-gallery", () => ({ buildGallery: vi.fn() }));
vi.mock("@/lib/product/item-category", () => ({ resolveItemCategory: vi.fn() }));
vi.mock("@/lib/discovery/customer-video-reviews", () => ({
  getCustomerVideoReviewsByProductSlug: vi.fn(() => []),
}));
vi.mock("@/lib/discovery/google-reviews", () => ({
  loadReviews: vi.fn(),
}));
vi.mock("@/lib/product/pdp-catalog-load", () => ({
  loadPdpCatalogSafely: vi.fn(),
}));
vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: vi.fn(),
  toReaderError: vi.fn(),
}));
vi.mock("@/lib/wix/fabrics", () => ({ listFabricSwatches: vi.fn() }));
vi.mock("@/lib/videos/catalog", () => ({ getVideoByProductSlug: vi.fn() }));
vi.mock("@/lib/models3d/catalog", () => ({ getGlbUrlByProductSlug: vi.fn() }));
vi.mock("@/lib/product/size-guide", () => ({
  getProductDimensions: vi.fn(),
  getCareGuide: vi.fn(),
}));
vi.mock("@/lib/product/plp-price", () => ({ formatPlpPrice: vi.fn() }));

beforeEach(() => {
  sentryCaptureException.mockReset();
  sentryFlush.mockReset().mockResolvedValue(true);
  getProductBySlug.mockReset();
});

async function callGenerateMetadata(slug: string) {
  const mod = await import("@/app/products/[slug]/page");
  return mod.generateMetadata({ params: Promise.resolve({ slug }) });
}

describe("PDP generateMetadata — logError integration on non-HTTPS image URL", () => {
  it("logs with scope='PDP' + op='non-HTTPS product image URL' + extra={slug, mainImageUrl}", async () => {
    getProductBySlug.mockResolvedValueOnce({
      name: "Kingston Frame",
      description: "Solid hardwood frame.",
      media: {
        mainMedia: { image: { url: "wix:image://v1/foo/hero.jpg" } },
      },
    });

    await callGenerateMetadata("kingston");

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [, opts] = sentryCaptureException.mock.calls[0]!;
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "PDP",
      op: "non-HTTPS product image URL",
    });
    expect(
      (opts as { extra: { slug: string; mainImageUrl: string } }).extra,
    ).toEqual({
      slug: "kingston",
      mainImageUrl: "wix:image://v1/foo/hero.jpg",
    });
    expect((opts as { level: string }).level).toBe("error");
    expect(sentryFlush).toHaveBeenCalledWith(2000);
  });

  it("logs for an http:// (non-HTTPS) URL too", async () => {
    getProductBySlug.mockResolvedValueOnce({
      name: "p",
      description: "",
      media: {
        mainMedia: { image: { url: "http://insecure.example.com/hero.jpg" } },
      },
    });

    await callGenerateMetadata("insecure-prod");

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [, opts] = sentryCaptureException.mock.calls[0]!;
    expect(
      (opts as { extra: { mainImageUrl: string } }).extra.mainImageUrl,
    ).toBe("http://insecure.example.com/hero.jpg");
  });

  it("https:// image: does NOT call Sentry — the URL is usable", async () => {
    getProductBySlug.mockResolvedValueOnce({
      name: "p",
      description: "",
      media: {
        mainMedia: { image: { url: "https://static.wixstatic.com/media/hero.jpg" } },
      },
    });

    await callGenerateMetadata("ok-prod");

    expect(sentryCaptureException).not.toHaveBeenCalled();
    expect(sentryFlush).not.toHaveBeenCalled();
  });

  it("missing mainImageUrl entirely: does NOT call Sentry — DEFAULT_OG_IMAGE handles the fallback silently", async () => {
    getProductBySlug.mockResolvedValueOnce({
      name: "p",
      description: "",
      media: {}, // no mainMedia
    });

    await callGenerateMetadata("no-image-prod");

    expect(sentryCaptureException).not.toHaveBeenCalled();
  });

  it("product not found: returns generic metadata, no Sentry", async () => {
    getProductBySlug.mockResolvedValueOnce(null);

    const meta = await callGenerateMetadata("does-not-exist");

    expect(meta).toEqual({ title: "Product — Carolina Futons" });
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });
});
