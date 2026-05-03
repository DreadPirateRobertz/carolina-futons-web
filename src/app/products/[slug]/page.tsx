import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEFAULT_OG_IMAGE } from "@/lib/og";

import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PdpInteractive } from "@/components/product/PdpInteractive";
import type { GalleryImage } from "@/components/product/PdpGallery";
import { PdpComfortBand } from "@/components/product/PdpComfortBand";
import { PdpCrossSell } from "@/components/product/PdpCrossSell";
import { PdpMattressBundle } from "@/components/product/PdpMattressBundle";
import {
  getMesaMattresses,
  isFutonFrame,
} from "@/lib/product/mattress-bundle";
import { PdpRecentlyViewed } from "@/components/product/PdpRecentlyViewed";
import { PdpReviews, pickPdpReviews } from "@/components/product/PdpReviews";
import { PdpShareButtons } from "@/components/product/PdpShareButtons";
import { PdpViewItemTracker } from "@/components/product/PdpViewItemTracker";
import { getReviewStats } from "@/lib/product/review-stats";
import { getProductBySlug } from "@/lib/wix/products";
import { logWixFailure } from "@/lib/wix/errors";
import { listFabricSwatches } from "@/lib/wix/fabrics";
import { getVideoByProductSlug } from "@/lib/videos/catalog";
import { getGlbUrlByProductSlug } from "@/lib/models3d/catalog";
import { PdpProductVideo } from "@/components/product/PdpProductVideo";
import type { SwatchItem } from "@/lib/swatch-request/swatch-request-schema";
import { formatPlpPrice } from "@/lib/product/plp-price";
import { getCrossSellProducts } from "@/lib/product/cross-sell";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  buildBreadcrumbSchema,
  buildProductSchema,
  resolveSiteUrl,
} from "@/lib/seo/json-ld";
import { AppDownloadBanner } from "@/components/site/AppDownloadBanner";
import { ArModelViewer } from "@/components/product/ArModelViewer";
import type { StockBadgeInput } from "@/lib/product/stock-badge-state";
import type {
  ProductOptionInput,
  VariantInput,
} from "@/lib/product/variant-selection";

export const dynamic = "force-dynamic"; // Phase 2: per-request until facets + caching tags wired

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await props.params;
    const product = await getProductBySlug(slug);
    if (!product) return { title: "Product — Carolina Futons" };
    // OG description max 160 chars — crawlers truncate beyond that anyway.
    const description = stripHtml(product.description ?? "").slice(0, 160);
    const mainImageUrl = product.media?.mainMedia?.image?.url;
    // Wix occasionally returns wix:image:// or other non-HTTPS URIs for products
    // whose media upload is still processing — those are invalid as OG images and
    // social crawlers silently discard them. Fall back to the default hero image.
    const isUsableUrl = (url: string) => url.startsWith("https://");
    if (mainImageUrl && !isUsableUrl(mainImageUrl)) {
      console.error(`[PDP] non-HTTPS product image URL for slug "${slug}":`, mainImageUrl);
    }
    const ogImage =
      mainImageUrl && isUsableUrl(mainImageUrl)
        ? { url: mainImageUrl, alt: product.name ?? undefined }
        : DEFAULT_OG_IMAGE;
    return {
      title: `${product.name} — Carolina Futons`,
      description,
      openGraph: {
        title: `${product.name} — Carolina Futons`,
        description,
        images: [ogImage],
      },
    };
  } catch (err) {
    await logWixFailure("pdp-generateMetadata", "params or product fetch", err);
    return { title: "Product — Carolina Futons" };
  }
}

export default async function PdpPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const mainUrl = product.media?.mainMedia?.image?.url;
  // cf-24q: use priceRange-aware formatter so manageVariants products don't
  // render "$0.00" before a variant is picked.
  const fallbackPrice = formatPlpPrice(product);
  const fallbackPriceCents = toCents(product.priceData?.price);
  // manageVariants products have priceData.price = 0; use priceRange.maxValue so
  // the white-glove widget renders for high-price variant products (cf-kcnu GAP-2).
  const whiteGlovePriceCents =
    fallbackPriceCents > 0 ? fallbackPriceCents : toCents(product.priceRange?.maxValue);
  const descriptionText = stripHtml(product.description ?? "");
  const productOptions = (product.productOptions ?? []) as ProductOptionInput[];
  const variants = (product.variants ?? []) as VariantInput[];
  const galleryImages = buildGallery(product);
  const stock = (product.stock ?? null) as StockBadgeInput | null;
  const crossSell = await getCrossSellProducts(product);
  const mattresses = isFutonFrame(slug) ? await getMesaMattresses() : [];
  let fabricSwatches: SwatchItem[] = [];
  let fabricSwatchError = false;
  try {
    fabricSwatches = await listFabricSwatches();
  } catch (err) {
    fabricSwatchError = true;
    await logWixFailure("pdp-fabricSwatches", "listFabricSwatches", err);
  }

  const productVideo = getVideoByProductSlug(slug);
  const glbUrl = getGlbUrlByProductSlug(slug) ?? "";

  const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const canonicalUrl = `${siteUrl}/products/${slug}`;
  // cf-xe54: surface the same review data the PdpReviews component renders
  // so on-page UI and JSON-LD stay in sync (Search Console flags mismatched
  // aggregateRating). Only honest stats + matching reviews are emitted —
  // pickPdpReviews returns [] when neither exact name nor category matches.
  const productNameForSchema = product.name ?? "";
  const reviewStats = getReviewStats(slug);
  const pdpReviews = pickPdpReviews(productNameForSchema);
  const productSchema = buildProductSchema({
    name: productNameForSchema,
    description: descriptionText,
    imageUrl: mainUrl ?? undefined,
    priceUSD: product.priceData?.price ?? 0,
    inStock: stock?.inStock !== false,
    canonicalUrl,
    aggregateRating:
      reviewStats && pdpReviews.length > 0
        ? { ratingValue: reviewStats.rating, reviewCount: reviewStats.count }
        : undefined,
    reviews:
      pdpReviews.length > 0
        ? pdpReviews.map((r) => ({
            author: r.author,
            rating: r.rating,
            title: r.title,
            body: r.body,
            date: r.date,
          }))
        : undefined,
  });
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: `${siteUrl}/` },
    { name: "Shop", url: `${siteUrl}/shop` },
    { name: product.name ?? "", url: canonicalUrl },
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <AppDownloadBanner />
      <JsonLd id="jsonld-product" schema={productSchema} />
      <JsonLd id="jsonld-breadcrumb" schema={breadcrumbSchema} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: product.name ?? "Product" },
        ]}
      />

      <PdpViewItemTracker
        item={{
          item_id: product._id ?? slug,
          item_name: product.name ?? "",
          item_category: product.collectionIds?.[0],
          price: product.priceData?.price ?? undefined,
        }}
      />

      {glbUrl ? <ArModelViewer glbUrl={glbUrl} productName={product.name ?? undefined} /> : null}

      <div className="mt-6">
        <PdpInteractive
          productId={product._id ?? ""}
          productSlug={slug}
          productName={product.name ?? ""}
          productOptions={productOptions}
          variants={variants}
          fallbackImageUrl={mainUrl}
          fallbackPrice={fallbackPrice}
          fallbackPriceCents={fallbackPriceCents}
          whiteGlovePriceCents={whiteGlovePriceCents}
          galleryImages={galleryImages}
          stock={stock}
          fabricSwatches={fabricSwatches}
          fabricSwatchError={fabricSwatchError}
          weightLbs={product.weight ?? 0}
        />
      </div>

      {productVideo ? <PdpProductVideo video={productVideo} /> : null}


      {descriptionText ? (
        <section className="mt-10 max-w-3xl">
          <h2 className="font-heading text-lg font-semibold text-cf-espresso">
            About this product
          </h2>
          <p className="mt-3 whitespace-pre-line text-cf-espresso/80">
            {descriptionText}
          </p>
        </section>
      ) : null}

      <PdpMattressBundle mattresses={mattresses} />

      <PdpComfortBand />

      <PdpReviews productSlug={slug} productName={product.name ?? ""} />

      <PdpShareButtons
        productUrl={canonicalUrl}
        productName={product.name ?? ""}
        imageUrl={mainUrl ?? undefined}
      />

      <PdpRecentlyViewed
        currentProductId={product._id ?? ""}
        currentProductSlug={slug}
        currentProductName={product.name ?? ""}
        currentProductImageUrl={mainUrl ?? undefined}
        currentProductPriceText={fallbackPrice || undefined}
      />

      <PdpCrossSell products={crossSell.items} error={crossSell.error} />
    </main>
  );
}

function toCents(price: number | null | undefined): number {
  if (typeof price !== "number" || !Number.isFinite(price)) return 0;
  return Math.round(price * 100);
}

type WixMediaProduct = {
  name?: string | null;
  media?: {
    mainMedia?: { image?: { url?: string | null } | null; title?: string | null } | null;
    items?: ReadonlyArray<{
      image?: { url?: string | null } | null;
      title?: string | null;
      mediaType?: string | null;
    }> | null;
  } | null;
};

// cf-3qt.6.F.1: build the ordered gallery list from Wix product.media.
// mainMedia leads, then media.items[] for image-type entries. Duplicates
// (mainMedia url appearing again in items) are filtered so the thumb strip
// doesn't show the same image twice.
function buildGallery(product: WixMediaProduct): GalleryImage[] {
  const seen = new Set<string>();
  const images: GalleryImage[] = [];
  const mainUrl = product.media?.mainMedia?.image?.url;
  if (mainUrl) {
    images.push({ url: mainUrl, alt: product.media?.mainMedia?.title ?? undefined });
    seen.add(mainUrl);
  }
  for (const item of product.media?.items ?? []) {
    if (item?.mediaType && item.mediaType !== "image") continue;
    const url = item?.image?.url;
    if (!url || seen.has(url)) continue;
    images.push({ url, alt: item.title ?? undefined });
    seen.add(url);
  }
  return images;
}

// Wix Stores `product.description` is HTML. Phase 2 placeholder: strip tags and
// render as plain text. Rich-HTML rendering with a sanitizer (DOMPurify or
// server-side sanitize-html) lands in a later slice alongside the PDP polish.
function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
