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
import { ShowroomCta } from "@/components/product/ShowroomCta";
import { PdpReviews, pickPdpReviews } from "@/components/product/PdpReviews";
import { CustomerVideoReviewGrid } from "@/components/product/CustomerVideoReviewGrid";
import { getCustomerVideoReviewsByProductSlug } from "@/lib/discovery/customer-video-reviews";
import { PdpShareButtons } from "@/components/product/PdpShareButtons";
import { PdpViewItemTracker } from "@/components/product/PdpViewItemTracker";
import { loadReviews } from "@/lib/discovery/google-reviews";
import { getProductBySlug } from "@/lib/wix/products";
import { logWixFailure } from "@/lib/wix/errors";
import { listFabricSwatches } from "@/lib/wix/fabrics";
import { getVideoByProductSlug } from "@/lib/videos/catalog";
import { getGlbUrlByProductSlug } from "@/lib/models3d/catalog";
import { PdpProductVideo } from "@/components/product/PdpProductVideo";
import { getProductDimensions, getCareGuide } from "@/lib/product/size-guide";
import { PdpSizeGuide } from "@/components/product/PdpSizeGuide";
import { ProductInfoModal } from "@/components/product/ProductInfoModal";
import type { SwatchItem } from "@/lib/swatch-request/swatch-request-schema";
import { formatPlpPrice } from "@/lib/product/plp-price";
import { getCrossSellProducts } from "@/lib/product/cross-sell";
import { getAlsoBoughtProducts } from "@/lib/product/also-bought";
import { PdpAlsoBought } from "@/components/product/PdpAlsoBought";
import { getProductBadges } from "@/lib/wix/product-badges";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  buildBreadcrumbSchema,
  buildProductSchema,
  resolveSiteUrl,
} from "@/lib/seo/json-ld";
import { twitterFromOpenGraph } from "@/lib/seo/twitter-from-og";
import { AppDownloadBanner } from "@/components/site/AppDownloadBanner";
import { ArModelViewer } from "@/components/product/ArModelViewer";
import type { StockBadgeInput } from "@/lib/product/stock-badge-state";
import type {
  GalleryMediaItem,
  ProductOptionInput,
  VariantInput,
} from "@/lib/product/variant-selection";
import { extractSpinFrames } from "@/lib/product/spin-frames";
import { wixImageUrl } from "@/lib/wix/wix-image";

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
    const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
    const openGraph = {
      title: `${product.name} — Carolina Futons`,
      description,
      images: [ogImage],
    };
    return {
      title: `${product.name} — Carolina Futons`,
      description,
      alternates: { canonical: `${siteUrl}/products/${slug}` },
      openGraph,
      twitter: twitterFromOpenGraph(openGraph),
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
  // cfw-1nm: include per-choice swatch media (color thumbnails) in the gallery
  // so the picker's variant-resolved imageUrl resolves to a real gallery index
  // and PdpGallery actually swaps the main image when a color is selected.
  const galleryImages = buildGallery(product, productOptions);
  // cfw-88r: pass raw media.items[] through so PdpInteractive can match
  // selected option values against image title/altText when admin hasn't
  // populated per-choice media on productOptions.
  const mediaItems = (product.media?.items ?? []) as GalleryMediaItem[];
  // cfw-x3w: detect 360°-spin frames (12+ images titled "spin-NN") so the
  // gallery can offer the spin-viewer toggle. Static gallery is preserved as
  // the default render path so the LCP candidate doesn't change.
  const spinImages = extractSpinFrames(mediaItems);
  const stock = (product.stock ?? null) as StockBadgeInput | null;
  const [crossSell, alsoBought, productBadges] = await Promise.all([
    getCrossSellProducts(product),
    getAlsoBoughtProducts(product),
    getProductBadges(slug),
  ]);
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
  const [dimensions, careGuide] = await Promise.all([
    getProductDimensions(product._id ?? slug),
    getCareGuide(slug),
  ]);

  const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const canonicalUrl = `${siteUrl}/products/${slug}`;
  // cf-xe54: surface the same review data the PdpReviews component renders
  // so on-page UI and JSON-LD stay in sync (Search Console flags mismatched
  // aggregateRating). Only honest stats + matching reviews are emitted —
  // pickPdpReviews returns [] when neither exact name nor category matches.
  const productNameForSchema = product.name ?? "";
  const loadedReviews = await loadReviews();
  const pdpReviews = pickPdpReviews(productNameForSchema, loadedReviews.reviews);
  const locationStats =
    loadedReviews.averageRating !== null && loadedReviews.totalReviewCount !== null
      ? { rating: loadedReviews.averageRating, count: loadedReviews.totalReviewCount }
      : null;
  const productSchema = buildProductSchema({
    name: productNameForSchema,
    description: descriptionText,
    imageUrl: mainUrl ?? undefined,
    priceUSD: product.priceData?.price ?? 0,
    inStock: stock?.inStock !== false,
    canonicalUrl,
    // Aggregate is the location-wide GBP rating (per-product GBP data does not
    // exist). Emitted only when matching reviews are also rendered on the page,
    // so JSON-LD never advertises a count without supporting cards.
    aggregateRating:
      locationStats && pdpReviews.length > 0
        ? { ratingValue: locationStats.rating, reviewCount: locationStats.count }
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

  // cfw-vxb: preload the LCP candidate so the browser starts the fetch
  // alongside HTML parse instead of after PdpGallery's client chunk
  // hydrates. React 19 hoists bare <link rel="preload"> tags into <head>.
  // Use the same constrained URL the gallery renders so the preload and
  // the eventual <img src> match exactly (no double-fetch).
  const lcpImageUrl = galleryImages[0]?.url ?? mainUrl;
  const lcpPreloadHref = lcpImageUrl ? wixImageUrl(lcpImageUrl, 600, 600) : "";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      {lcpPreloadHref ? (
        <link
          rel="preload"
          as="image"
          href={lcpPreloadHref}
          fetchPriority="high"
        />
      ) : null}
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
          mediaItems={mediaItems}
          spinImages={spinImages}
          stock={stock}
          badges={productBadges}
          fabricSwatches={fabricSwatches}
          fabricSwatchError={fabricSwatchError}
          weightLbs={product.weight ?? 0}
        />
      </div>

      <ShowroomCta />

      {productVideo ? <PdpProductVideo video={productVideo} /> : null}


      {descriptionText ? (
        <section className="mt-16 max-w-3xl border-t border-cf-divider pt-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <h2 className="font-heading text-lg font-semibold text-cf-espresso">
              About this product
            </h2>
            <ProductInfoModal
              productName={product.name ?? ""}
              dimensions={dimensions}
              careGuide={careGuide}
            />
          </div>
          <p className="mt-1 whitespace-pre-line text-cf-espresso/80">
            {descriptionText}
          </p>
        </section>
      ) : null}

      <PdpSizeGuide
        productName={product.name ?? ""}
        dimensions={dimensions}
        careGuide={careGuide}
      />

      <PdpMattressBundle mattresses={mattresses} />

      <PdpComfortBand />

      <PdpReviews
        productSlug={slug}
        productName={product.name ?? ""}
        reviews={loadedReviews.reviews}
        stats={locationStats}
        error={!loadedReviews.ok}
      />

      <CustomerVideoReviewGrid
        videos={getCustomerVideoReviewsByProductSlug(slug)}
      />

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
      <PdpAlsoBought products={alsoBought.items} error={alsoBought.error} />
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
// mainMedia leads, then media.items[] for image-type entries. cfw-1nm: also
// fold in per-choice swatch media (productOptions[*].choices[*].media), since
// Wix Stores v1 attaches color photos to the choice — not the variant — and
// PdpGallery requires `activeUrl` to be present in this list to actually swap.
// Duplicates are filtered so the thumb strip doesn't show the same image twice.
function buildGallery(
  product: WixMediaProduct,
  productOptions?: ReadonlyArray<ProductOptionInput>,
): GalleryImage[] {
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
  for (const option of productOptions ?? []) {
    for (const choice of option.choices ?? []) {
      const url = choice.media?.mainMedia?.image?.url;
      if (!url || seen.has(url)) continue;
      images.push({ url, alt: choice.description ?? choice.value ?? undefined });
      seen.add(url);
    }
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
