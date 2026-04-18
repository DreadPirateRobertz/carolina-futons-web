import type { MetadataRoute } from "next";

import { SHOP_CATEGORIES } from "@/lib/shop/categories";
import { listProducts } from "@/lib/wix/products";

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
] as const;

// Pull as many products as Wix will return in one call. 1000 is the SDK hard
// cap; past that the listing truncates and the sitemap would silently drop
// products. If the catalog ever grows beyond 1000 SKUs, paginate here.
const PRODUCT_SITEMAP_LIMIT = 1000;

export function resolveSiteBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.carolinafutons.com";
  return raw.replace(/\/+$/, "");
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

  const products = await listProducts(PRODUCT_SITEMAP_LIMIT);
  const productEntries: MetadataRoute.Sitemap = products
    .filter(
      (p): p is typeof p & { slug: string } =>
        typeof p.slug === "string" && p.slug.length > 0,
    )
    .map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: now,
    }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
