import type { MetadataRoute } from "next";

import { SHOP_CATEGORIES } from "@/lib/shop/categories";
import { listAllPostSlugs } from "@/lib/wix/blog";
import { listAllProducts } from "@/lib/wix/products";
import { SEO_CITIES } from "@/lib/seo/cities";

// Site-wide sitemap (cf-sitemap). Next.js serves this at /sitemap.xml.
// Static routes are the canonical CF marketing + policy pages; dynamic
// routes come from the SHOP_CATEGORIES manifest and the Wix product
// catalog. If the Wix reader errors the listProducts helper returns []
// so the sitemap still publishes the static + category entries.
const STATIC_PATHS = [
  "/",
  "/shop",
  "/about",
  "/contact",
  "/shipping",
  "/returns",
  "/warranty",
  "/blog",
  "/press",
  // Header sub-nav pages — add here when a new sub-nav destination becomes a permanent 200 route.
  "/design-a-room",
  "/guides",
  "/reviews",
  "/visit",
  // Legal/compliance pages — must appear in the sitemap regardless of traffic value.
  "/accessibility",
  "/privacy",
  "/terms",
  // High-value content pages linked from navigation.
  "/faq",
  "/getting-it-home",
  "/videos",
  "/sustainability",
] as const;

// cfw-upa: Wix queryProducts() caps .limit() at 100 per call. The previous
// PRODUCT_SITEMAP_LIMIT=1000 single call hit SDK validation and the
// listProducts catch silently returned [], dropping every product URL
// from /sitemap.xml. listAllProducts paginates 100 at a time up to its
// own SITEMAP_CATALOG_CAP=1000 (covers ~10x today's 88 SKUs).

export function resolveSiteBase(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }
  // VERCEL_PROJECT_PRODUCTION_URL is the stable production alias (e.g.
  // carolina-futons-web.vercel.app). Prefer it over VERCEL_URL, which is
  // the deployment-specific URL and changes on every preview build.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  // VERCEL_URL: deployment-specific fallback — still better than localhost
  // for preview builds that haven't set NEXT_PUBLIC_SITE_URL.
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = resolveSiteBase();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
  }));

  const categoryEntries: MetadataRoute.Sitemap = SHOP_CATEGORIES.map(
    (category) => ({
      url: `${base}/shop/${category.slug}`,
      lastModified: now,
    }),
  );

  const products = await listAllProducts();
  const productEntries: MetadataRoute.Sitemap = products
    .filter(
      (p): p is typeof p & { slug: string } =>
        typeof p.slug === "string" && p.slug.length > 0,
    )
    .map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: now,
    }));

  const postSlugs = await listAllPostSlugs(100);
  const postEntries: MetadataRoute.Sitemap = postSlugs.map((slug) => ({
    url: `${base}/blog/${slug}`,
    lastModified: now,
  }));

  const cityEntries: MetadataRoute.Sitemap = SEO_CITIES.map((city) => ({
    url: `${base}/near/${city.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [
    ...staticEntries,
    ...categoryEntries,
    ...productEntries,
    ...postEntries,
    ...cityEntries,
  ];
}
