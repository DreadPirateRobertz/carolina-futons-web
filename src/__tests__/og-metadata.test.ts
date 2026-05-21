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

// Referral action — used by referral/share/[code] generateMetadata
vi.mock("@/app/actions/referral", () => ({
  getReferralByCodeAction: vi.fn(),
  getMyReferralCodeAction: vi.fn(),
  getMyReferralStatsAction: vi.fn(),
}));
vi.mock("@/lib/auth/member", () => ({ getMemberSession: vi.fn() }));
vi.mock("@/lib/cms/faq", () => ({ listFaqs: vi.fn(), groupFaqsByCategory: vi.fn() }));
vi.mock("@/lib/wix/community-gallery", () => ({ listCommunityPhotos: vi.fn() }));

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
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/logging/log-error", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

import { metadata as layoutMetadata } from "@/app/layout";
import { metadata as shopMetadata } from "@/app/shop/page";
import { generateMetadata as categoryGenerateMeta } from "@/app/shop/[category]/page";
import { generateMetadata as pdpGenerateMeta } from "@/app/products/[slug]/page";
import { metadata as galleryMetadata } from "@/app/community-gallery/page";
import { metadata as gallerySubmitMetadata } from "@/app/community-gallery/submit/page";
import { metadata as contactMetadata } from "@/app/contact/page";
import { metadata as faqMetadata } from "@/app/faq/page";
import { metadata as pressMetadata } from "@/app/press/page";
import { metadata as privacyMetadata } from "@/app/privacy/page";
import { metadata as referralMetadata } from "@/app/referral/page";
import { generateMetadata as referralShareGenerateMeta } from "@/app/referral/share/[code]/page";
import { metadata as signupMetadata } from "@/app/signup/page";
import { metadata as termsMetadata } from "@/app/terms/page";
import { metadata as returnsMetadata } from "@/app/returns/page";
import { metadata as blogIndexMetadata } from "@/app/blog/page";
import { findCategory } from "@/lib/shop/categories";
import { getProductBySlug } from "@/lib/wix/products";
import { getReferralByCodeAction } from "@/app/actions/referral";
import { DEFAULT_OG_IMAGE } from "@/lib/og";

const mockFindCategory = vi.mocked(findCategory);
const mockGetProductBySlug = vi.mocked(getProductBySlug);

// Helper: extract URL strings from a Next.js OGImage[] field.
// Handles both string-shorthand and object form; ignores URL-object variant
// (not produced by this codebase).
function ogImageUrls(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images.map((img) => (typeof img === "string" ? img : (img as { url: string }).url));
}

// ── DEFAULT_OG_IMAGE constant ──────────────────────────────────────────────

describe("DEFAULT_OG_IMAGE", () => {
  it("is a Wix CDN HTTPS URL", () => {
    expect(DEFAULT_OG_IMAGE.url).toMatch(/^https:\/\/static\.wixstatic\.com\//);
  });

  it("has 1920×1080 dimensions matching the CDN transform params in the URL", () => {
    expect(DEFAULT_OG_IMAGE.width).toBe(1920);
    expect(DEFAULT_OG_IMAGE.height).toBe(1080);
    expect(DEFAULT_OG_IMAGE.url).toContain("w_1920,h_1080");
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
    expect((layoutMetadata.openGraph as { type?: string } | undefined)?.type).toBe("website");
  });

  it("has openGraph.locale = 'en_US'", () => {
    expect(layoutMetadata.openGraph?.locale).toBe("en_US");
  });

  it("has twitter.card = 'summary_large_image'", () => {
    expect((layoutMetadata.twitter as { card?: string } | undefined)?.card).toBe("summary_large_image");
  });

  it("includes DEFAULT_OG_IMAGE url in openGraph.images", () => {
    const urls = ogImageUrls(layoutMetadata.openGraph?.images);
    expect(urls).toContain(DEFAULT_OG_IMAGE.url);
  });

  it("has metadataBase set to an https URL", () => {
    const base = layoutMetadata.metadataBase;
    const protocol = base instanceof URL ? base.protocol : new URL(base as string).protocol;
    expect(protocol).toBe("https:");
  });
});

// ── Shop PLP metadata ──────────────────────────────────────────────────────

describe("Shop PLP metadata", () => {
  it("has openGraph.title = 'Shop — Carolina Futons'", () => {
    expect(shopMetadata.openGraph?.title).toBe("Shop — Carolina Futons");
  });

  it("has openGraph.description matching the page description", () => {
    expect(shopMetadata.openGraph?.description).toBe(shopMetadata.description);
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

  it("includes width+height on the category OG image object", async () => {
    mockFindCategory.mockReturnValue(category as never);
    const meta = await categoryGenerateMeta({ params: Promise.resolve({ category: "futon-frames" }) });
    const img = (meta.openGraph?.images as { url: string; width?: number; height?: number }[])?.[0];
    expect(img?.width).toBe(600);
    expect(img?.height).toBe(400);
  });

  it("falls back to DEFAULT_OG_IMAGE when category has no image", async () => {
    mockFindCategory.mockReturnValue({ ...category, image: undefined } as never);
    const meta = await categoryGenerateMeta({ params: Promise.resolve({ category: "futon-frames" }) });
    expect(ogImageUrls(meta.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });

  it("returns fallback title 'Shop — Carolina Futons' when category is not found", async () => {
    mockFindCategory.mockReturnValue(undefined);
    const meta = await categoryGenerateMeta({ params: Promise.resolve({ category: "unknown" }) });
    expect(meta.title).toBe("Shop — Carolina Futons");
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

  it("truncates OG description to 160 chars", async () => {
    const longDesc = "A".repeat(200);
    mockGetProductBySlug.mockResolvedValue({ ...product, description: longDesc } as never);
    const meta = await pdpGenerateMeta({ params: Promise.resolve({ slug: "monterey-futon" }) });
    expect((meta.openGraph?.description ?? "").length).toBeLessThanOrEqual(160);
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

  it("falls back to DEFAULT_OG_IMAGE when mainMedia is null", async () => {
    mockGetProductBySlug.mockResolvedValue({ ...product, media: { mainMedia: null } } as never);
    const meta = await pdpGenerateMeta({ params: Promise.resolve({ slug: "monterey-futon" }) });
    expect(ogImageUrls(meta.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });

  it("falls back to DEFAULT_OG_IMAGE for non-HTTPS image URL", async () => {
    mockLogError.mockClear();
    mockGetProductBySlug.mockResolvedValue({
      ...product,
      media: { mainMedia: { image: { url: "wix:image://v1/abc.jpg" } } },
    } as never);
    const meta = await pdpGenerateMeta({ params: Promise.resolve({ slug: "monterey-futon" }) });
    expect(ogImageUrls(meta.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });

  // Logger migration (cfw-logger batch 6): the non-HTTPS marker is a
  // catalog-data hygiene observability event — it doesn't throw, but we
  // want Sentry coverage so Brenda's bad media uploads surface in the
  // dashboard. Three tests pin: source tag, op tag, error message
  // payload carrying both slug + URL for triage.
  it("calls logError with source='PDP' when product image is non-HTTPS", async () => {
    mockLogError.mockClear();
    mockGetProductBySlug.mockResolvedValue({
      ...product,
      media: { mainMedia: { image: { url: "wix:image://v1/abc.jpg" } } },
    } as never);
    await pdpGenerateMeta({ params: Promise.resolve({ slug: "monterey-futon" }) });
    expect(mockLogError).toHaveBeenCalledTimes(1);
    expect(mockLogError.mock.calls[0][0]).toBe("PDP");
  });

  it("passes op='generateMetadata.non-https-image' so Sentry can group these together", async () => {
    mockLogError.mockClear();
    mockGetProductBySlug.mockResolvedValue({
      ...product,
      media: { mainMedia: { image: { url: "wix:image://v1/abc.jpg" } } },
    } as never);
    await pdpGenerateMeta({ params: Promise.resolve({ slug: "monterey-futon" }) });
    expect(mockLogError.mock.calls[0][1]).toBe("generateMetadata.non-https-image");
  });

  it("error message carries both the slug and the bad URL for triage", async () => {
    mockLogError.mockClear();
    mockGetProductBySlug.mockResolvedValue({
      ...product,
      media: { mainMedia: { image: { url: "wix:image://v1/abc.jpg" } } },
    } as never);
    await pdpGenerateMeta({ params: Promise.resolve({ slug: "monterey-futon" }) });
    const passed = mockLogError.mock.calls[0][2] as Error;
    expect(passed).toBeInstanceOf(Error);
    expect(passed.message).toContain("monterey-futon");
    expect(passed.message).toContain("wix:image://v1/abc.jpg");
  });

  it("returns fallback title 'Product — Carolina Futons' when product is not found", async () => {
    mockGetProductBySlug.mockResolvedValue(null);
    const meta = await pdpGenerateMeta({ params: Promise.resolve({ slug: "not-a-product" }) });
    expect(meta.title).toBe("Product — Carolina Futons");
  });
});

// ── cf-ceex: per-page OG sweep on 13 pages ────────────────────────────────

describe("cf-ceex per-page OG sweep", () => {
  it("/about has openGraph + ABOUT_HERO_PHOTO image", async () => {
    const { metadata } = await import("@/app/about/page");
    expect(metadata.openGraph?.title).toBe("About — Carolina Futons");
    expect(metadata.openGraph?.description).toContain("Family-owned");
    expect(ogImageUrls(metadata.openGraph?.images)[0]).toMatch(
      /^https:\/\/static\.wixstatic\.com\//,
    );
  });

  it("/visit has openGraph with distinct description", async () => {
    const { metadata } = await import("@/app/visit/page");
    expect(metadata.openGraph?.description).toContain("showroom");
    expect(ogImageUrls(metadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });

  it("/getting-it-home has openGraph with distinct description", async () => {
    const { metadata } = await import("@/app/getting-it-home/page");
    expect(metadata.openGraph?.description).toContain("delivers");
    expect(ogImageUrls(metadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });

  it("/design-a-room has openGraph + canonical", async () => {
    const { metadata } = await import("@/app/design-a-room/page");
    const desc = metadata.openGraph?.description ?? "";
    expect(desc).toContain("futon");
    expect(desc).toContain("consultation");
    expect(desc.length).toBeLessThanOrEqual(160);
    expect(metadata.alternates?.canonical).toBe("/design-a-room");
  });

  it("/reviews has openGraph with distinct description", async () => {
    const { metadata } = await import("@/app/reviews/page");
    expect(metadata.openGraph?.description).toContain("Real reviews");
  });

  it("/guides (listing) has openGraph with distinct description", async () => {
    const { metadata } = await import("@/app/guides/page");
    expect(metadata.openGraph?.description).toContain("guides");
    expect(metadata.openGraph?.url).toBe("/guides");
  });

  it("/guides/[slug] generateMetadata emits og:type article with canonical", async () => {
    const { generateMetadata } = await import("@/app/guides/[slug]/page");
    // `listGuides()` tries Wix CMS first and falls back to the static
    // `GUIDES` array on failure (see src/lib/discovery/guides.ts). In jsdom
    // the Wix client throws so the fallback wins — that's good enough for
    // this assertion because the slug we pass is also in the static array.
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "how-to-pick-a-futon-mattress" }),
    });
    expect((meta.openGraph as { type?: string })?.type).toBe("article");
    expect(meta.alternates?.canonical).toBe("/guides/how-to-pick-a-futon-mattress");
    expect((meta.twitter as { card?: string })?.card).toBe("summary_large_image");
  });

  it("/guides/[slug] notFound branch returns minimal metadata", async () => {
    const { generateMetadata } = await import("@/app/guides/[slug]/page");
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "not-a-real-guide-slug" }),
    });
    expect(meta.title).toBe("Guide not found — Carolina Futons");
    expect(meta.openGraph).toBeUndefined();
    expect(meta.alternates).toBeUndefined();
  });

  it("/compare empty-state generateMetadata has openGraph + description + twitter", async () => {
    const { generateMetadata } = await import("@/app/compare/page");
    const meta = await generateMetadata({
      searchParams: Promise.resolve({}),
    });
    expect(meta.openGraph?.description).toContain("side-by-side");
    expect(ogImageUrls(meta.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
    expect((meta.twitter as { card?: string })?.card).toBe("summary_large_image");
  });

  it("/compare populated branch keeps robots:noindex and adds openGraph + twitter", async () => {
    const product = {
      _id: "p1",
      name: "Monterey",
      slug: "monterey-futon",
      description: "<p>Monterey hardwood futon.</p>",
      media: { mainMedia: { image: { url: "https://static.wixstatic.com/media/p1.jpg" } } },
    };
    mockGetProductBySlug.mockResolvedValue(product as never);
    const { generateMetadata } = await import("@/app/compare/page");
    const meta = await generateMetadata({
      searchParams: Promise.resolve({ slugs: "monterey-futon,charleston-platform-bed" }),
    });
    expect((meta.robots as { index?: boolean })?.index).toBe(false);
    expect((meta.robots as { follow?: boolean })?.follow).toBe(true);
    expect(meta.openGraph?.description).toContain("side-by-side");
    expect(ogImageUrls(meta.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
    expect((meta.twitter as { card?: string })?.card).toBe("summary_large_image");
  });

  it("all sweep pages (incl. dynamic) have distinct openGraph.description", async () => {
    const staticModules = await Promise.all([
      import("@/app/about/page"),
      import("@/app/visit/page"),
      import("@/app/getting-it-home/page"),
      import("@/app/design-a-room/page"),
      import("@/app/reviews/page"),
      import("@/app/guides/page"),
    ]);
    const { generateMetadata: compareGen } = await import("@/app/compare/page");
    const { generateMetadata: guideSlugGen } = await import("@/app/guides/[slug]/page");
    const { generateMetadata: springSaleGen } = await import("@/app/spring-sale/page");
    const compareMeta = await compareGen({ searchParams: Promise.resolve({}) });
    const guideMeta = await guideSlugGen({
      params: Promise.resolve({ slug: "how-to-pick-a-futon-mattress" }),
    });
    const springSaleMeta = await springSaleGen();
    const descriptions = [
      ...staticModules.map((m) => m.metadata.openGraph?.description),
      compareMeta.openGraph?.description,
      guideMeta.openGraph?.description,
      springSaleMeta.openGraph?.description,
    ];
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("all sweep page openGraph images are HTTPS Wix CDN URLs", async () => {
    const staticModules = await Promise.all([
      import("@/app/about/page"),
      import("@/app/visit/page"),
      import("@/app/getting-it-home/page"),
      import("@/app/design-a-room/page"),
      import("@/app/reviews/page"),
      import("@/app/guides/page"),
    ]);
    const { generateMetadata: springSaleGen } = await import("@/app/spring-sale/page");
    const springSaleMeta = await springSaleGen();
    const allImageUrls = [
      ...staticModules.flatMap((m) => ogImageUrls(m.metadata.openGraph?.images)),
      ...ogImageUrls(springSaleMeta.openGraph?.images),
    ];
    expect(allImageUrls.length).toBeGreaterThan(0);
    for (const url of allImageUrls) {
      expect(url).toMatch(/^https:\/\/static\.wixstatic\.com\//);
    }
  });

  it("all sweep pages mirror openGraph → twitter via twitterFromOpenGraph", async () => {
    const staticModules = await Promise.all([
      import("@/app/about/page"),
      import("@/app/visit/page"),
      import("@/app/getting-it-home/page"),
      import("@/app/design-a-room/page"),
      import("@/app/reviews/page"),
      import("@/app/guides/page"),
    ]);
    const { generateMetadata: springSaleGen } = await import("@/app/spring-sale/page");
    const springSaleMeta = await springSaleGen();
    for (const m of staticModules) {
      expect((m.metadata.twitter as { card?: string })?.card).toBe("summary_large_image");
      expect((m.metadata.twitter as { title?: string })?.title).toBe(
        m.metadata.openGraph?.title,
      );
    }
    expect((springSaleMeta.twitter as { card?: string })?.card).toBe("summary_large_image");
    expect((springSaleMeta.twitter as { title?: string })?.title).toBe(
      springSaleMeta.openGraph?.title,
    );
  });
});

// ── cf-o5j5.fu1: backfill OG tests for 10 pages from PR #556 ─────────────
// PR #556 shipped openGraph on these pages with zero test coverage.
// These pin the contract so future edits can't silently break OG metadata.

const mockGetReferralByCode = vi.mocked(getReferralByCodeAction);

describe("/community-gallery metadata", () => {
  it("has correct OG title", () => {
    expect(galleryMetadata.openGraph?.title).toBe("Community Gallery — Carolina Futons");
  });
  it("has non-empty OG description", () => {
    expect((galleryMetadata.openGraph?.description ?? "").length).toBeGreaterThan(0);
  });
  it("uses DEFAULT_OG_IMAGE", () => {
    expect(ogImageUrls(galleryMetadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });
});

describe("/community-gallery/submit metadata", () => {
  it("has correct OG title", () => {
    expect(gallerySubmitMetadata.openGraph?.title).toBe(
      "Share Your Photo — Community Gallery | Carolina Futons",
    );
  });
  it("has non-empty OG description", () => {
    expect((gallerySubmitMetadata.openGraph?.description ?? "").length).toBeGreaterThan(0);
  });
  it("uses DEFAULT_OG_IMAGE", () => {
    expect(ogImageUrls(gallerySubmitMetadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });
});

describe("/contact metadata", () => {
  it("has correct OG title", () => {
    expect(contactMetadata.openGraph?.title).toBe("Contact — Carolina Futons");
  });
  it("OG description matches page description", () => {
    expect(contactMetadata.openGraph?.description).toBe(contactMetadata.description);
  });
  it("uses DEFAULT_OG_IMAGE", () => {
    expect(ogImageUrls(contactMetadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });
  it("has canonical /contact", () => {
    expect(contactMetadata.alternates?.canonical).toBe("/contact");
  });
});

describe("/faq metadata", () => {
  it("has correct OG title", () => {
    expect(faqMetadata.openGraph?.title).toBe("FAQ — Carolina Futons");
  });
  it("OG description matches page description", () => {
    expect(faqMetadata.openGraph?.description).toBe(faqMetadata.description);
  });
  it("uses DEFAULT_OG_IMAGE", () => {
    expect(ogImageUrls(faqMetadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });
});

describe("/press metadata", () => {
  it("has correct OG title", () => {
    expect(pressMetadata.openGraph?.title).toBe("Press & Media — Carolina Futons");
  });
  it("OG description mentions family-owned / Hendersonville", () => {
    expect(pressMetadata.openGraph?.description).toContain("Hendersonville");
  });
  it("uses DEFAULT_OG_IMAGE", () => {
    expect(ogImageUrls(pressMetadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });
});

describe("/privacy metadata", () => {
  it("has correct OG title", () => {
    expect(privacyMetadata.openGraph?.title).toBe("Privacy Policy — Carolina Futons");
  });
  it("OG description matches page description", () => {
    expect(privacyMetadata.openGraph?.description).toBe(privacyMetadata.description);
  });
  it("uses DEFAULT_OG_IMAGE", () => {
    expect(ogImageUrls(privacyMetadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });
});

describe("/referral metadata", () => {
  it("has correct OG title", () => {
    expect(referralMetadata.openGraph?.title).toBe("Referral Program — Carolina Futons");
  });
  it("OG description matches page description", () => {
    expect(referralMetadata.openGraph?.description).toBe(referralMetadata.description);
  });
  it("uses DEFAULT_OG_IMAGE", () => {
    expect(ogImageUrls(referralMetadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });
});

describe("/referral/share/[code] generateMetadata", () => {
  it("personalises title when referrer name is known", async () => {
    mockGetReferralByCode.mockResolvedValue({
      success: true,
      referral: { referrerName: "Alice" },
    } as never);
    const meta = await referralShareGenerateMeta({
      params: Promise.resolve({ code: "ABC123" }),
    });
    expect(meta.openGraph?.title).toBe("Alice invited you — 5% off at Carolina Futons");
  });

  it("uses generic title when referral code is not found", async () => {
    mockGetReferralByCode.mockResolvedValue({ success: false } as never);
    const meta = await referralShareGenerateMeta({
      params: Promise.resolve({ code: "UNKNOWN" }),
    });
    expect(meta.openGraph?.title).toBe("You're invited — 5% off at Carolina Futons");
  });

  it("always includes DEFAULT_OG_IMAGE", async () => {
    mockGetReferralByCode.mockResolvedValue({ success: false } as never);
    const meta = await referralShareGenerateMeta({
      params: Promise.resolve({ code: "X" }),
    });
    expect(ogImageUrls(meta.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });

  it("description mentions 5% off", async () => {
    mockGetReferralByCode.mockResolvedValue({ success: false } as never);
    const meta = await referralShareGenerateMeta({
      params: Promise.resolve({ code: "X" }),
    });
    expect(meta.openGraph?.description).toContain("5%");
  });
});

describe("/signup metadata", () => {
  it("has correct OG title", () => {
    expect(signupMetadata.openGraph?.title).toBe("Create Account — Carolina Futons");
  });
  it("OG description matches page description", () => {
    expect(signupMetadata.openGraph?.description).toBe(signupMetadata.description);
  });
  it("uses DEFAULT_OG_IMAGE", () => {
    expect(ogImageUrls(signupMetadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });
});

describe("/terms metadata", () => {
  it("has correct OG title", () => {
    expect(termsMetadata.openGraph?.title).toBe("Terms of Service — Carolina Futons");
  });
  it("OG description matches page description", () => {
    expect(termsMetadata.openGraph?.description).toBe(termsMetadata.description);
  });
  it("uses DEFAULT_OG_IMAGE", () => {
    expect(ogImageUrls(termsMetadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });
});

// ── cf-2qxr (cf-o5j5.2): pin twitter:card on the same 10 PR #556 pages ──
//
// cf-e55k (PR #582 merged) added twitter:card to 5 priority pages
// (home/about/visit/gift-cards/guides/[slug]) using twitterFromOpenGraph.
// The 10 pages PR #556 introduced still lacked the twitter mirror — these
// pins ensure every social-preview surface ships with the same Facebook /
// Slack / iMessage / X unfurl shape.
//
// Contract per page:
//   - twitter.card === 'summary_large_image'
//   - twitter.title  === openGraph.title
//   - twitter.description === openGraph.description
//   - twitter.images === openGraph.images (mirrored via twitterFromOpenGraph)

describe("cf-2qxr — twitter:card mirror for PR #556 pages", () => {
  const pages = [
    { name: "/community-gallery", meta: galleryMetadata },
    { name: "/community-gallery/submit", meta: gallerySubmitMetadata },
    { name: "/contact", meta: contactMetadata },
    { name: "/faq", meta: faqMetadata },
    { name: "/press", meta: pressMetadata },
    { name: "/privacy", meta: privacyMetadata },
    { name: "/referral", meta: referralMetadata },
    { name: "/signup", meta: signupMetadata },
    { name: "/terms", meta: termsMetadata },
  ];

  for (const { name, meta } of pages) {
    describe(name, () => {
      it("has twitter.card === 'summary_large_image'", () => {
        expect((meta.twitter as { card?: string } | undefined)?.card).toBe(
          "summary_large_image",
        );
      });

      it("twitter.title mirrors openGraph.title", () => {
        const tTitle = (meta.twitter as { title?: string } | undefined)?.title;
        expect(tTitle).toBe(meta.openGraph?.title);
      });

      it("twitter.description mirrors openGraph.description", () => {
        const tDesc = (meta.twitter as { description?: string } | undefined)
          ?.description;
        expect(tDesc).toBe(meta.openGraph?.description);
      });

      it("twitter.images includes DEFAULT_OG_IMAGE url", () => {
        const tImgs = (meta.twitter as { images?: unknown } | undefined)
          ?.images;
        const urls = ogImageUrls(tImgs);
        expect(urls).toContain(DEFAULT_OG_IMAGE.url);
      });
    });
  }
});

// /referral/share/[code] uses generateMetadata (async) so it's tested
// against the dynamic call, not the static metadata export above.
describe("cf-2qxr — twitter:card mirror for /referral/share/[code]", () => {
  it("twitter mirrors openGraph for the dynamic share page", async () => {
    mockGetReferralByCode.mockResolvedValueOnce({
      success: true,
      referral: {
        valid: true,
        referrerName: "Jane Doe",
        discountPct: 5,
      },
    });
    const { generateMetadata } = await import(
      "@/app/referral/share/[code]/page"
    );
    const m = await generateMetadata({
      params: Promise.resolve({ code: "AB12CD" }),
    });
    expect((m.twitter as { card?: string } | undefined)?.card).toBe(
      "summary_large_image",
    );
    expect((m.twitter as { title?: string } | undefined)?.title).toBe(
      m.openGraph?.title,
    );
    expect((m.twitter as { description?: string } | undefined)?.description).toBe(
      m.openGraph?.description,
    );
  });
});

// ── cf-o5j5.1: wave32 cfw-x84 per-page OG snapshot backfill ────────────────
//
// PR #556 (cfw-x84) shipped openGraph metadata on 10 pages without locking
// in test coverage. morgott's cf-o5j5 audit (PR #1339) categorized this as
// the wave's one substantive gap. These tests pin the contract for each
// touched page so a future edit can't silently regress og:title /
// description / images.
describe("cf-o5j5.1 wave32 cfw-x84 OG backfill", () => {
  it("/community-gallery has openGraph + DEFAULT_OG_IMAGE", async () => {
    const { metadata } = await import("@/app/community-gallery/page");
    expect(metadata.openGraph?.title).toBeTruthy();
    expect((metadata.openGraph?.description ?? "").length).toBeGreaterThan(0);
    expect(ogImageUrls(metadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });

  it("/community-gallery/submit has openGraph + DEFAULT_OG_IMAGE", async () => {
    const { metadata } = await import("@/app/community-gallery/submit/page");
    expect(metadata.openGraph?.title).toBeTruthy();
    expect((metadata.openGraph?.description ?? "").length).toBeGreaterThan(0);
    expect(ogImageUrls(metadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });

  it("/contact has openGraph + canonical + DEFAULT_OG_IMAGE", async () => {
    const { metadata } = await import("@/app/contact/page");
    expect(metadata.openGraph?.title).toBeTruthy();
    expect((metadata.openGraph?.description ?? "").length).toBeGreaterThan(0);
    expect(metadata.alternates?.canonical).toBe("/contact");
    expect(ogImageUrls(metadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });

  it("/faq has openGraph + DEFAULT_OG_IMAGE", async () => {
    const { metadata } = await import("@/app/faq/page");
    expect(metadata.openGraph?.title).toBeTruthy();
    expect((metadata.openGraph?.description ?? "").length).toBeGreaterThan(0);
    expect(ogImageUrls(metadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });

  it("/press has openGraph + DEFAULT_OG_IMAGE", async () => {
    const { metadata } = await import("@/app/press/page");
    expect(metadata.openGraph?.title).toBeTruthy();
    expect((metadata.openGraph?.description ?? "").length).toBeGreaterThan(0);
    expect(ogImageUrls(metadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });

  it("/privacy has openGraph + DEFAULT_OG_IMAGE", async () => {
    const { metadata } = await import("@/app/privacy/page");
    expect(metadata.openGraph?.title).toBeTruthy();
    expect((metadata.openGraph?.description ?? "").length).toBeGreaterThan(0);
    expect(ogImageUrls(metadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });

  it("/referral has openGraph + DEFAULT_OG_IMAGE", async () => {
    const { metadata } = await import("@/app/referral/page");
    expect(metadata.openGraph?.title).toBeTruthy();
    expect((metadata.openGraph?.description ?? "").length).toBeGreaterThan(0);
    expect(ogImageUrls(metadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });

  it("/signup has openGraph + DEFAULT_OG_IMAGE", async () => {
    const { metadata } = await import("@/app/signup/page");
    expect(metadata.openGraph?.title).toBeTruthy();
    expect((metadata.openGraph?.description ?? "").length).toBeGreaterThan(0);
    expect(ogImageUrls(metadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });

  it("/terms has openGraph + DEFAULT_OG_IMAGE", async () => {
    const { metadata } = await import("@/app/terms/page");
    expect(metadata.openGraph?.title).toBeTruthy();
    expect((metadata.openGraph?.description ?? "").length).toBeGreaterThan(0);
    expect(ogImageUrls(metadata.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
  });

  describe("/referral/share/[code] generateMetadata", () => {
    it("uses the inviter's name in the OG title on success", async () => {
      const { generateMetadata } = await import(
        "@/app/referral/share/[code]/page"
      );
      const { getReferralByCodeAction } = await import("@/app/actions/referral");
      vi.mocked(getReferralByCodeAction).mockResolvedValue({
        success: true,
        referral: { referrerName: "Asha M." },
      } as never);
      const meta = await generateMetadata({
        params: Promise.resolve({ code: "ASHA-1234" }),
      });
      expect(meta.openGraph?.title).toContain("Asha M.");
      expect(ogImageUrls(meta.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
    });

    it("falls back to a generic invite title when the code lookup fails", async () => {
      const { generateMetadata } = await import(
        "@/app/referral/share/[code]/page"
      );
      const { getReferralByCodeAction } = await import("@/app/actions/referral");
      vi.mocked(getReferralByCodeAction).mockResolvedValue({
        success: false,
      } as never);
      const meta = await generateMetadata({
        params: Promise.resolve({ code: "BAD-CODE" }),
      });
      expect(meta.openGraph?.title).toBe("You're invited — 5% off at Carolina Futons");
      expect(ogImageUrls(meta.openGraph?.images)).toContain(DEFAULT_OG_IMAGE.url);
    });
  });

  it("all 10 backfilled pages emit distinct openGraph.description", async () => {
    const staticModules = await Promise.all([
      import("@/app/community-gallery/page"),
      import("@/app/community-gallery/submit/page"),
      import("@/app/contact/page"),
      import("@/app/faq/page"),
      import("@/app/press/page"),
      import("@/app/privacy/page"),
      import("@/app/referral/page"),
      import("@/app/signup/page"),
      import("@/app/terms/page"),
    ]);
    const descriptions = staticModules.map(
      (m) => m.metadata.openGraph?.description,
    );
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });
});

// cf-e9o (cfw-x84 follow-up): /returns + /blog were missing openGraph
// when cfw-x84's sweep ran (they landed after / weren't picked up at the
// time). Wiring both up + asserting twitter mirrors openGraph via the
// helper. /track-order is intentionally omitted — noindex+nofollow private
// tracking URLs shouldn't unfurl attractively when shared.
describe("/returns metadata (cf-e9o)", () => {
  it("has openGraph title matching page title", () => {
    expect(returnsMetadata.openGraph?.title).toBe("Returns — Carolina Futons");
  });
  it("openGraph description matches page description", () => {
    expect(returnsMetadata.openGraph?.description).toBe(
      returnsMetadata.description,
    );
  });
  it("uses DEFAULT_OG_IMAGE", () => {
    expect(ogImageUrls(returnsMetadata.openGraph?.images)).toContain(
      DEFAULT_OG_IMAGE.url,
    );
  });
  it("twitter card is summary_large_image", () => {
    expect(
      (returnsMetadata.twitter as { card?: string } | undefined)?.card,
    ).toBe("summary_large_image");
  });
  it("twitter title mirrors openGraph title", () => {
    expect(
      (returnsMetadata.twitter as { title?: string } | undefined)?.title,
    ).toBe(returnsMetadata.openGraph?.title);
  });
});

describe("/blog metadata (cf-e9o)", () => {
  it("has openGraph title matching page title", () => {
    expect(blogIndexMetadata.openGraph?.title).toBe("Journal — Carolina Futons");
  });
  it("openGraph description matches page description", () => {
    expect(blogIndexMetadata.openGraph?.description).toBe(
      blogIndexMetadata.description,
    );
  });
  it("uses DEFAULT_OG_IMAGE", () => {
    expect(ogImageUrls(blogIndexMetadata.openGraph?.images)).toContain(
      DEFAULT_OG_IMAGE.url,
    );
  });
  it("twitter card is summary_large_image", () => {
    expect(
      (blogIndexMetadata.twitter as { card?: string } | undefined)?.card,
    ).toBe("summary_large_image");
  });
});
