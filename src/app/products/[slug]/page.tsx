import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PdpInteractive } from "@/components/product/PdpInteractive";
import type { GalleryImage } from "@/components/product/PdpGallery";
import { PdpCrossSell } from "@/components/product/PdpCrossSell";
import { PdpRecentlyViewed } from "@/components/product/PdpRecentlyViewed";
import { getProductBySlug } from "@/lib/wix/products";
import { formatPlpPrice } from "@/lib/product/plp-price";
import { getCrossSellProducts } from "@/lib/product/cross-sell";
import type { StockBadgeInput } from "@/lib/product/stock-badge-state";
import type {
  ProductOptionInput,
  VariantInput,
} from "@/lib/product/variant-selection";

export const dynamic = "force-dynamic"; // Phase 2: per-request until facets + caching tags wired

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product — Carolina Futons" };
  return {
    title: `${product.name} — Carolina Futons`,
    description: stripHtml(product.description ?? "").slice(0, 160),
  };
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
  const descriptionText = stripHtml(product.description ?? "");
  const productOptions = (product.productOptions ?? []) as ProductOptionInput[];
  const variants = (product.variants ?? []) as VariantInput[];
  const galleryImages = buildGallery(product);
  const stock = (product.stock ?? null) as StockBadgeInput | null;
  const crossSell = await getCrossSellProducts(product);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-cf-espresso/60">
        <Link href="/shop" className="hover:underline">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <span className="text-cf-espresso">{product.name}</span>
      </nav>

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
          galleryImages={galleryImages}
          stock={stock}
        />
      </div>

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
