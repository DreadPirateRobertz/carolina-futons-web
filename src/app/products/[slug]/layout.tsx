import type { ReactNode } from "react";

import { JsonLd } from "@/components/seo/JsonLd";
import {
  buildBreadcrumbSchema,
  buildProductSchema,
  resolveSiteUrl,
} from "@/lib/seo/json-ld";
import { stripHtml } from "@/lib/text/strip-html";
import { getProductBySlug } from "@/lib/wix/products";

/**
 * Segment layout for `/products/[slug]`. Its sole job is to emit the
 * `Product` and `BreadcrumbList` JSON-LD into the **server-rendered HTML**.
 *
 * WHY a layout and not the page (cfw-yyay): `products/[slug]/page.tsx` has a
 * sibling `loading.tsx`, so Next wraps the page in a `<Suspense>` boundary.
 * The page's per-request data (reviews, fabric swatches, cross-sell) makes it
 * render dynamically, so it streams — and anything rendered *inside* the page,
 * including `<JsonLd>`, lands only in the RSC flight payload, never the
 * initial HTML. Google's Rich Results Test and non-rendering SEO crawlers
 * read that initial HTML and would see no `Product` markup at all.
 *
 * A segment layout renders *outside* the child segment's `loading.tsx`
 * Suspense boundary, so its output is part of the prerendered static shell.
 * This layout depends only on {@link getProductBySlug} — catalog data that is
 * build-resolvable (proven by `generateMetadata` prerendering successfully) —
 * and never the streaming review/swatch fetches, so it stays static.
 *
 * @param props.children - The `/products/[slug]` page subtree.
 * @param props.params - Route params promise resolving to `{ slug }`.
 * @returns The JSON-LD `<script>` tags followed by the page subtree. When the
 *   slug is unknown the JSON-LD is omitted and only `children` is rendered —
 *   `page.tsx` itself calls `notFound()` for that case.
 */
export default async function PdpLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return <>{children}</>;

  const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const canonicalUrl = `${siteUrl}/products/${slug}`;
  const mainImageUrl = product.media?.mainMedia?.image?.url;
  // Wix occasionally returns wix:image:// URIs for products still processing;
  // those are invalid as schema.org image values, so fall back to omitting it.
  const imageUrl =
    mainImageUrl && mainImageUrl.startsWith("https://")
      ? mainImageUrl
      : undefined;

  const productSchema = buildProductSchema({
    name: product.name ?? "",
    description: stripHtml(product.description ?? ""),
    imageUrl,
    priceUSD: product.priceData?.price ?? 0,
    inStock: product.stock?.inStock !== false,
    canonicalUrl,
  });
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: `${siteUrl}/` },
    { name: "Shop", url: `${siteUrl}/shop` },
    { name: product.name ?? "", url: canonicalUrl },
  ]);

  return (
    <>
      <JsonLd id="jsonld-product" schema={productSchema} />
      <JsonLd id="jsonld-breadcrumb" schema={breadcrumbSchema} />
      {children}
    </>
  );
}
