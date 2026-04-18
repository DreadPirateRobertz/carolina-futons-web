// TDD tests for Open Graph + Twitter Card metadata across all pages.
// Tests the metadata export/function directly — not the rendered page markup.

import { describe, it, expect, vi, beforeEach } from "vitest";

// next/font/google performs filesystem ops at module init — stub it so layout
// can be imported in jsdom without a Next.js build pipeline.
vi.mock("next/font/google", () => ({
  Playfair_Display: () => ({ variable: "--font-playfair", className: "" }),
  Source_Sans_3: () => ({ variable: "--font-source-sans", className: "" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono", className: "" }),
}));

// Layout component dependencies (prevent transitive side-effects on import)
vi.mock("@/components/site/Header", () => ({ Header: () => null }));
vi.mock("@/components/site/Footer", () => ({ Footer: () => null }));
vi.mock("@/components/cart/CartProvider", () => ({ CartProvider: ({ children }: { children: unknown }) => children }));
vi.mock("@/components/cart/CartDrawer", () => ({ CartDrawer: () => null }));
vi.mock("@/components/motion/LenisProvider", () => ({ LenisProvider: () => null }));
vi.mock("@/components/motion/MotionProvider", () => ({ MotionProvider: ({ children }: { children: unknown }) => children }));
vi.mock("@/components/motion/PageTransition", () => ({ PageTransition: ({ children }: { children: unknown }) => children }));

// Server/SDK dependencies used by category + PDP pages
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/wix-client", () => ({ getWixClient: vi.fn() }));
vi.mock("@/lib/wix/products", () => ({
  getProductBySlug: vi.fn(),
  getCollectionBySlug: vi.fn(),
}));
vi.mock("@/lib/wix/plp", () => ({ getCollectionPlp: vi.fn() }));
vi.mock("@/lib/shop/categories", async () => {
  const actual = await vi.importActual<typeof import("@/lib/shop/categories")>(
    "@/lib/shop/categories",
  );
  return { ...actual, findCategory: vi.fn() };
});
vi.mock("@/lib/shop/derived-products", () => ({ resolveDerivedProducts: vi.fn() }));
vi.mock("@/lib/shop/plp-observability", () => ({ logOverPaginatedRender: vi.fn() }));
vi.mock("@/lib/product/cross-sell", () => ({ getCrossSellProducts: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));

import { metadata as layoutMetadata } from "@/app/layout";
import { metadata as shopMetadata } from "@/app/shop/page";
import { generateMetadata as categoryGenerateMeta } from "@/app/shop/[category]/page";
import { generateMetadata as pdpGenerateMeta } from "@/app/products/[slug]/page";
import { findCategory } from "@/lib/shop/categories";
import { getProductBySlug } from "@/lib/wix/products";
import { DEFAULT_OG_IMAGE } from "@/lib/og";

const mockFindCategory = vi.mocked(findCategory);
const mockGetProductBySlug = vi.mocked(getProductBySlug);

// Helper: extract URL strings from a Next.js OGImage[] field.
function ogImageUrls(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images.map((img) => (typeof img === "string" ? img : (img as { url: string }).url));
}

// ── DEFAULT_OG_IMAGE constant ──────────────────────────────────────────────

describe("DEFAULT_OG_IMAGE", () => {
  it("points to the first HERO_SLIDES Wix CDN URL", () => {
    expect(DEFAULT_OG_IMAGE.url).toContain("static.wixstatic.com");
    expect(DEFAULT_OG_IMAGE.url).toContain("e04e89_72d82110638045c39e0f6274363c15f8");
  });

  it("has 1920×1080 dimensions", () => {
    expect(DEFAULT_OG_IMAGE.width).toBe(1920);
    expect(DEFAULT_OG_IMAGE.height).toBe(1080);
  });

  it("has descriptive alt text", () => {
    expect(DEFAULT_OG_IMAGE.alt.length).toBeGreaterThan(0);
  });
});

// ── Root layout metadata ───────────────────────────────────────────────────

describe("Root layout metadata", () => {
  it("has openGraph.siteName = 'Carolina Futons'", () => {
    expect(layoutMetadata.openGraph?.siteName).toBe("Carolina Futons");
  });

  it("has openGraph.type = 'website'", () => {
    expect(layoutMetadata.openGraph?.type).toBe("website");
  });

  it("has openGraph.locale = 'en_US'", () => {
    expect(layoutMetadata.openGraph?.locale).toBe("en_US");
  });

  it("has twitter.card = 'summary_large_image'", () => {
    expect(layoutMetadata.twitter?.card).toBe("summary_large_image");
  });

  it("includes DEFAULT_OG_IMAGE url in openGraph.images", () => {
    const urls = ogImageUrls(layoutMetadata.openGraph?.images);
    expect(urls).toContain(DEFAULT_OG_IMAGE.url);
  });
});

// ── Shop PLP metadata ──────────────────────────────────────────────────────

describe("Shop PLP metadata", () => {
  it("has openGraph.title", () => {
    expect(shopMetadata.openGraph?.title).toBeTruthy();
  });

  it("has openGraph.description", () => {
    expect(shopMetadata.openGraph?.description).toBeTruthy();
  });

  it("has openGraph.images with at least one entry", () => {
    const images = shopMetadata.openGraph?.images;
    expect(Array.isArray(images) && images.length > 0).toBe(true);
  });
});

// ── Shop category generateMetadata ────────────────────────────────────────

describe("Shop category generateMetadata", () => {
  const category = {
    slug: "futon-frames",
    name: "Futon Frames",
    description: "Hardwood futon frames made in North Carolina.",
    collectionSlug: "futon-frames",
    image: "https://static.wixstatic.com/media/category-futon-frames.jpg",
  };

  beforeEach(() => {
    mockFindCategory.mockReturnValue(category as Parameters<typeof mockFindCategory>[0] extends string ? ReturnType<typeof mockFindCategory> : never);
  });

  it("returns OG title containing category name", async () => {
    mockFindCategory.mockReturnValue(category as never);
    const meta = await categoryGenerateMeta({ params: Promise.resolve({ category: "futon-frames" }) });
    expect(meta.openGraph?.title).toContain("Futon Frames");
  });

  it("returns OG description matching category description", async () => {
    mockFindCategory.mockReturnValue(category as never);
    const meta = await categoryGenerateMeta({ params: Promise.resolve({ category: "futon-frames" }) });
    expect(meta.openGraph?.description).toBe(category.description);
  });

  it("returns OG image from category.image", async () => {
    mockFindCategory.mockReturnValue(category as never);
    const meta = await categoryGenerateMeta({ params: Promise.resolve({ category: "futon-frames" }) });
    expect(ogImageUrls(meta.openGraph?.images)).toContain(category.image);
  });

  it("falls back to DEFAULT_OG_IMAGE when category has no image", async () => {
    mockFindCategory.mockReturnValue({ ...category, image: undefined } as never);
    const meta = await categoryGenerateMeta({ params: Promise.resolve({ category: "futon-frames" }) });
    expect(ogImageUrls(meta.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });

  it("returns a title when category is not found", async () => {
    mockFindCategory.mockReturnValue(undefined);
    const meta = await categoryGenerateMeta({ params: Promise.resolve({ category: "unknown" }) });
    expect(typeof meta.title === "string" || meta.title != null).toBe(true);
  });
});

// ── PDP generateMetadata ───────────────────────────────────────────────────

describe("PDP generateMetadata", () => {
  const product = {
    _id: "prod-1",
    name: "Monterey Futon",
    description: "<p>Beautiful hardwood futon.</p>",
    media: {
      mainMedia: {
        image: { url: "https://static.wixstatic.com/media/product-main.jpg" },
      },
    },
  };

  beforeEach(() => {
    mockGetProductBySlug.mockResolvedValue(product as never);
  });

  it("returns OG title containing product name", async () => {
    const meta = await pdpGenerateMeta({ params: Promise.resolve({ slug: "monterey-futon" }) });
    expect(meta.openGraph?.title).toContain("Monterey Futon");
  });

  it("returns OG description with HTML stripped", async () => {
    const meta = await pdpGenerateMeta({ params: Promise.resolve({ slug: "monterey-futon" }) });
    expect(meta.openGraph?.description).toContain("Beautiful hardwood futon");
    expect(meta.openGraph?.description).not.toContain("<p>");
  });

  it("returns OG image from product.media.mainMedia.image.url", async () => {
    const meta = await pdpGenerateMeta({ params: Promise.resolve({ slug: "monterey-futon" }) });
    expect(ogImageUrls(meta.openGraph?.images)).toContain(
      "https://static.wixstatic.com/media/product-main.jpg",
    );
  });

  it("falls back to DEFAULT_OG_IMAGE when product has no main image", async () => {
    mockGetProductBySlug.mockResolvedValue({ ...product, media: {} } as never);
    const meta = await pdpGenerateMeta({ params: Promise.resolve({ slug: "monterey-futon" }) });
    expect(ogImageUrls(meta.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });

  it("returns a title when product is not found", async () => {
    mockGetProductBySlug.mockResolvedValue(null);
    const meta = await pdpGenerateMeta({ params: Promise.resolve({ slug: "not-a-product" }) });
    expect(typeof meta.title === "string" || meta.title != null).toBe(true);
  });
});
