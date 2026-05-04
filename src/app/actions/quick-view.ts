"use server";

import { getProductBySlug } from "@/lib/wix/products";
import { extractColorChoices, type ColorChoice } from "@/lib/product/color-options";
import { formatPlpPrice } from "@/lib/product/plp-price";

export type QuickViewProduct = {
  productId: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  priceText: string;
  inStock: boolean;
  colorChoices: ColorChoice[];
};

// Strip Wix's HTML description down to plain text for the modal preview.
// Mirrors the conservative pattern in src/app/products/[slug]/page.tsx.
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

export async function getQuickViewProductData(
  slug: string,
): Promise<QuickViewProduct | null> {
  const product = await getProductBySlug(slug);
  if (!product || !product._id) return null;
  const description = stripHtml(product.description ?? "").slice(0, 240);
  return {
    productId: product._id,
    slug,
    name: product.name ?? "",
    description,
    imageUrl: product.media?.mainMedia?.image?.url ?? null,
    priceText: formatPlpPrice(product),
    inStock: product.stock?.inStock !== false,
    colorChoices: extractColorChoices(product),
  };
}
