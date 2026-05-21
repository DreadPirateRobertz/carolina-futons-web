import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEFAULT_OG_IMAGE } from "@/lib/og";

import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PdpInteractive } from "@/components/product/PdpInteractive";
import { buildGallery } from "@/lib/product/build-gallery";
import { PdpComfortBand } from "@/components/product/PdpComfortBand";
import { PdpCrossSell } from "@/components/product/PdpCrossSell";
import { PdpMattressBundle } from "@/components/product/PdpMattressBundle";
import {
  getMesaMattresses,
  isFutonFrame,
} from "@/lib/product/mattress-bundle";
import {
  flagSuspiciousMattressMembership,
  isStandaloneMattress,
} from "@/lib/product/warranty-gate";
import { resolveItemCategory } from "@/lib/product/item-category";
import { PdpRecentlyViewed } from "@/components/product/PdpRecentlyViewed";
import { ShowroomCta } from "@/components/product/ShowroomCta";
import { PdpReviews } from "@/components/product/PdpReviews";
import { CustomerVideoReviewGrid } from "@/components/product/CustomerVideoReviewGrid";
import { getCustomerVideoReviewsByProductSlug } from "@/lib/discovery/customer-video-reviews";
import { PdpShareButtons } from "@/components/product/PdpShareButtons";
import { PdpViewItemTracker } from "@/components/product/PdpViewItemTracker";
import { loadReviews } from "@/lib/discovery/google-reviews";
import {
  getCollectionBySlug,
  getProductBySlug,
  listAllProducts,
} from "@/lib/wix/products";
import { loadPdpCatalogSafely } from "@/lib/product/pdp-catalog-load";
import { logError } from "@/lib/observability/log";
import { logWixFailure } from "@/lib/wix/errors";
import { listFabricSwatches } from "@/lib/wix/fabrics";
import { getVideoByProductSlug } from "@/lib/videos/catalog";
import { getGlbUrlByProductSlug } from "@/lib/models3d/catalog";
import { PdpProductVideo } from "@/components/product/PdpProductVideo";
import { getProductDimensions, getCareGuide } from "@/lib/product/size-guide";
import { PdpSizeGuide } from "@/components/product/PdpSizeGuide";
import { PdpWarrantyInfo } from "@/components/product/PdpWarrantyInfo";
import { ProductInfoModal } from "@/components/product/ProductInfoModal";
import type { SwatchItem } from "@/lib/swatch-request/swatch-request-schema";
import { formatPlpPrice } from "@/lib/product/plp-price";
// cf-8xw2: getCrossSellProducts + getAlsoBoughtProducts now flow through
// loadPdpCatalogSafely (the Promise.allSettled isolation wrapper); they're
// not invoked directly from this file anymore.
import { PdpAlsoBought } from "@/components/product/PdpAlsoBought";
import { resolveSiteUrl } from "@/lib/seo/json-ld";
import { stripHtml } from "@/lib/text/strip-html";
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

// cf-0oj5: ISR with 1-hour revalidation. Kingston PDP Lighthouse showed
// perf 68 / LCP 7.3s (cf-sd80 baseline 2026-05-16). Root cause: `dynamic
// = "force-dynamic"` forced a full SSR + Wix SDK round-trip on every
// request — TTFB dominated LCP. Catalog data changes rarely (price/stock
// updates are hours-cadence, not seconds), so serving cached HTML with a
// 1-hour revalidation window eliminates the per-request SSR cost while
// keeping freshness within tolerable bounds. Per cf-3qt.7 facet/cache
// plan: this is the unblock for Phase 7's caching-tags work — once
// tag-based invalidation lands, revalidate can drop to longer windows
// with explicit invalidation on stock/price webhooks.
export const revalidate = 3600;

// cf-c736 (cf-0oj5.fu5): pre-render every catalog slug at build time.
// Combined with dynamicParams=false, this serves known slugs from the
// build-time cache (instant 200, no Wix SDK roundtrip per request) and
// returns 404 for unknown slugs. The revalidate=3600 window above
// continues to refresh cached pages every hour for content updates.
// Unblocks once cf-0klm removed layout.tsx's cookies() opt-out (PR #714).
export async function generateStaticParams() {
  const products = await listAllProducts();
  return products
    .filter(
      (p): p is typeof p & { slug: string } =>
        typeof p.slug === "string" && p.slug.length > 0,
    )
    .map((p) => ({ slug: p.slug }));
}

// 404 unknown slugs at the edge instead of paying for a runtime SSR
// fallback. The catalog ID set is closed (~88 SKUs); a slug that wasn't
// in the build-time crawl is almost certainly a typo or scraper request.
export const dynamicParams = false;

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
      logError("PDP", `non-HTTPS product image URL for slug "${slug}"`, undefined, { url: mainImageUrl });
    }
    const ogImage =
      mainImageUrl && isUsableUrl(mainImageUrl)
        ? { url: mainImageUrl, alt: product.name ?? undefined }
        : DEFAULT_OG_IMAGE;
    // cf-bbo8: explicit canonical so utm/ref query params don't split link
    // equity. The Product JSON-LD already carries canonicalUrl but search
    // engines treat the metadata-level <link rel="canonical"> as the
    // authoritative HTML signal — without it Google canonicalizes
    // ?utm_source=email variants to themselves.
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
  const galleryImages = buildGallery(product, productOptions, variants);
  // cfw-88r: pass raw media.items[] through so PdpInteractive can match
  // selected option values against image title/altText when admin hasn't
  // populated per-choice media on productOptions.
  const mediaItems = (product.media?.items ?? []) as GalleryMediaItem[];
  // cfw-x3w: detect 360°-spin frames (12+ images titled "spin-NN") so the
  // gallery can offer the spin-viewer toggle. Static gallery is preserved as
  // the default render path so the LCP candidate doesn't change.
  const spinImages = extractSpinFrames(mediaItems);
  const stock = (product.stock ?? null) as StockBadgeInput | null;
  // cf-8xw2 + cf-12u4: loadPdpCatalogSafely (Promise.allSettled isolation)
  // runs alongside the 5 category-collection lookups for GA4 item_category
  // resolution — all 6 network hops start concurrently.
  const [
    catalogResult,
    futonFramesCollection,
    murphyCollection,
    platformCollection,
    sofaCollection,
    saleCollection,
  ] = await Promise.all([
    loadPdpCatalogSafely(product, slug),
    getCollectionBySlug("futon-frames"),
    getCollectionBySlug("murphy-cabinet-beds"),
    getCollectionBySlug("platform-beds"),
    getCollectionBySlug("sofa-beds"),
    getCollectionBySlug("sale"),
  ]);
  const { crossSell, alsoBought, productBadges, mattressesCollection } =
    catalogResult;
  // cf-g640: PDP frame-warranty gate. isStandaloneMattress fail-closes
  // on indeterminate state (Wix outage, slug rename, orphan product)
  // so a mattress PDP never accidentally claims the 15-year frame
  // warranty during a degraded window — express-warranty
  // misrepresentation under NC GS 25-2-313 is the legal cost being
  // hedged. See warranty-gate.ts module docstring + the
  // FAIL-CLOSED describe block in its tests for the full rationale.
  const isMattressProduct = isStandaloneMattress(product, mattressesCollection);
  // cf-tmdb (cf-g640.fu4): operator-side signal for merchandiser mis-
  // tagging. isStandaloneMattress correctly suppresses the warranty
  // section, but does it SILENTLY — a "Kingston Futon Frame" wrongly
  // added to the mattresses collection loses its warranty copy with no
  // signal to on-call. This Sentry breadcrumb fires only when the
  // suppression is suspicious (frame-shape slug + mattresses
  // membership) so the merchandiser can fix the CMS instead of the
  // bug persisting silently. Fire-and-forget — never block the render.
  if (flagSuspiciousMattressMembership(product, mattressesCollection, slug)) {
    void logWixFailure(
      "warranty-gate",
      "suspicious-mattress-membership",
      new Error(
        `Product slug "${slug}" looks like a frame but is classified as a standalone mattress (warranty section suppressed). Investigate Wix Stores collection tagging.`,
      ),
    );
  }
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
  // cfw-yyay: the Product + BreadcrumbList JSON-LD that previously consumed
  // this review data moved to products/[slug]/layout.tsx. Rendered from this
  // page it was trapped behind loading.tsx's <Suspense> boundary and never
  // reached the server HTML; the layout sits outside that boundary so its
  // JSON-LD is part of the prerendered static shell. loadReviews() stays here
  // because PdpReviews (below) still renders the same data as visible cards.
  const loadedReviews = await loadReviews();
  const locationStats =
    loadedReviews.averageRating !== null && loadedReviews.totalReviewCount !== null
      ? { rating: loadedReviews.averageRating, count: loadedReviews.totalReviewCount }
      : null;

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
          // cf-12u4: priority-aware category resolver (set-membership,
          // not collectionIds[0]) keeps GA4 item_category aligned with
          // the warranty gate. Mattresses-on-sale now report as
          // 'mattresses', not 'sale' — closes the marketing-dashboard
          // under-count this bug was causing.
          item_category: resolveItemCategory(product, {
            mattresses: mattressesCollection,
            "futon-frames": futonFramesCollection,
            "murphy-cabinet-beds": murphyCollection,
            "platform-beds": platformCollection,
            "sofa-beds": sofaCollection,
            sale: saleCollection,
          }),
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

      <PdpWarrantyInfo
        productId={product._id ?? ""}
        productName={product.name ?? ""}
        isMattress={isMattressProduct}
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
