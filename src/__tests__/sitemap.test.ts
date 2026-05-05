import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stubs for transitively-pulled server deps so the sitemap module can be
// imported in a unit context (the Wix client + Sentry setup both explode
// under jsdom otherwise).
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/wix-client", () => ({ getWixClient: vi.fn() }));
vi.mock("@/lib/wix/products", () => ({
  listAllProducts: vi.fn(),
}));
vi.mock("@/lib/wix/blog", () => ({
  listAllPostSlugs: vi.fn(),
}));
vi.mock("@/lib/shop/categories", () => ({
  SHOP_CATEGORIES: [
    { slug: "futon-frames", name: "Futon Frames", collectionSlug: "futon-frames" },
    { slug: "mattresses", name: "Mattresses", collectionSlug: "mattresses" },
  ],
}));

import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { listAllProducts } from "@/lib/wix/products";
import { listAllPostSlugs } from "@/lib/wix/blog";

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.carolinafutons.com";
  vi.mocked(listAllProducts).mockResolvedValue([]);
  vi.mocked(listAllPostSlugs).mockResolvedValue([]);
});

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
  vi.restoreAllMocks();
});

describe("sitemap()", () => {
  it("includes every canonical static route exactly once", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    const expected = [
      "/",
      "/shop",
      "/about",
      "/contact",
      "/shipping",
      "/returns",
      "/warranty",
      "/blog",
      "/press",
      "/design-a-room",
      "/guides",
      "/reviews",
      "/visit",
      "/accessibility",
      "/privacy",
      "/terms",
      "/faq",
      "/getting-it-home",
      "/videos",
      "/sustainability",
    ].map((p) => `https://www.carolinafutons.com${p}`);
    for (const url of expected) {
      expect(urls).toContain(url);
      expect(urls.filter((u) => u === url)).toHaveLength(1);
    }
  });

  it("adds one entry per SHOP_CATEGORIES slug under /shop/{slug}", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://www.carolinafutons.com/shop/futon-frames");
    expect(urls).toContain("https://www.carolinafutons.com/shop/mattresses");
  });

  it("adds one entry per product slug returned by listProducts", async () => {
    vi.mocked(listAllProducts).mockResolvedValueOnce([
      { _id: "p1", slug: "oak-loft" },
      { _id: "p2", slug: "maple-daybed" },
    ] as never);
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://www.carolinafutons.com/products/oak-loft");
    expect(urls).toContain(
      "https://www.carolinafutons.com/products/maple-daybed",
    );
  });

  // cfw-upa: regression — listAllProducts paginates past the Wix 100-cap.
  // Previously sitemap.ts called listProducts(1000), the SDK rejected the
  // 1000 limit, the catch returned [] and the sitemap silently dropped
  // every product URL. listAllProducts is expected to surface ALL of them.
  it("emits one entry per product even when the catalog exceeds the Wix 100-per-call cap", async () => {
    const big = Array.from({ length: 150 }, (_, i) => ({
      _id: `p${i}`,
      slug: `sku-${i}`,
    }));
    vi.mocked(listAllProducts).mockResolvedValueOnce(big as never);
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    for (let i = 0; i < 150; i += 1) {
      expect(urls).toContain(
        `https://www.carolinafutons.com/products/sku-${i}`,
      );
    }
  });

  it("skips products with missing/empty slug (defensive — the PDP route needs one)", async () => {
    vi.mocked(listAllProducts).mockResolvedValueOnce([
      { _id: "good", slug: "good" },
      { _id: "no-slug", slug: "" },
      { _id: "no-slug-2" },
    ] as never);
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://www.carolinafutons.com/products/good");
    expect(urls.some((u) => u.endsWith("/products/"))).toBe(false);
    expect(urls.some((u) => u.includes("/products/undefined"))).toBe(false);
  });

  it("adds one entry per blog post slug returned by listAllPostSlugs", async () => {
    vi.mocked(listAllPostSlugs).mockResolvedValueOnce([
      "futon-vs-sofa-bed",
      "wool-wrapped-mattress-care",
    ]);
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain(
      "https://www.carolinafutons.com/blog/futon-vs-sofa-bed",
    );
    expect(urls).toContain(
      "https://www.carolinafutons.com/blog/wool-wrapped-mattress-care",
    );
  });

  it("every entry carries a lastModified Date so Next serializes <lastmod>", async () => {
    const entries = await sitemap();
    for (const entry of entries) {
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
  });

  it("strips trailing slashes from NEXT_PUBLIC_SITE_URL so URLs aren't doubled", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.carolinafutons.com/";
    const entries = await sitemap();
    expect(entries[0]!.url).toBe("https://www.carolinafutons.com/");
    // Root path "/" + base without trailing slash = single slash. No "//".
    expect(entries.every((e) => !/[^:]\/\//.test(e.url))).toBe(true);
  });

  it("prefers VERCEL_PROJECT_PRODUCTION_URL over VERCEL_URL for stable prod host (cf-kj8n)", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "carolina-futons-web.vercel.app";
    process.env.VERCEL_URL = "cfw-abc123-git-main.vercel.app"; // deployment-specific
    const entries = await sitemap();
    expect(
      entries.every((e) => e.url.startsWith("https://carolina-futons-web.vercel.app")),
    ).toBe(true);
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
  });

  it("falls back to VERCEL_URL when VERCEL_PROJECT_PRODUCTION_URL is unset (cf-izyc)", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_URL = "cfw-abc123.vercel.app";
    const entries = await sitemap();
    expect(
      entries.every((e) => e.url.startsWith("https://cfw-abc123.vercel.app")),
    ).toBe(true);
    delete process.env.VERCEL_URL;
  });

  it("falls back to localhost when no Vercel env vars are set", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
    const entries = await sitemap();
    expect(
      entries.every((e) => e.url.startsWith("http://localhost:3000")),
    ).toBe(true);
  });
});

describe("robots()", () => {
  it("emits a single allow-all rule for user-agent '*'", () => {
    const r = robots();
    expect(r.rules).toEqual([{ userAgent: "*", allow: "/" }]);
  });

  it("points at the absolute sitemap URL so crawlers don't guess the origin", () => {
    const r = robots();
    expect(r.sitemap).toBe(
      "https://www.carolinafutons.com/sitemap.xml",
    );
  });

  it("picks up a custom NEXT_PUBLIC_SITE_URL (preview/staging deploys)", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://preview.carolinafutons.com";
    const r = robots();
    expect(r.sitemap).toBe(
      "https://preview.carolinafutons.com/sitemap.xml",
    );
  });
});
