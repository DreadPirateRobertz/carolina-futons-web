// Fetches the three Mesa mattress options for the futon PDP bundle panel
// (cf-h1i4). Slugs are configured here so marketing can remap without a
// code change. Returns a sparse array — products that fail to resolve (not
// yet published, renamed) are omitted rather than crashing the PDP.
import "server-only";

import { getProductBySlug } from "@/lib/wix/products";
import { formatPlpPrice } from "@/lib/product/plp-price";

export type MattressOption = {
  id: string;
  slug: string;
  name: string;
  comfort: "Plush" | "Medium" | "Firm";
  tagline: string;
  priceText: string;
  unitPriceCents: number;
  imageUrl?: string;
};

const MESA_CONFIGS = [
  { slug: "mesa-1000-mattress", comfort: "Plush" as const, tagline: "Cloud-soft support" },
  { slug: "mesa-3000-mattress", comfort: "Medium" as const, tagline: "Balanced everyday comfort" },
  { slug: "mesa-5000-mattress", comfort: "Firm" as const, tagline: "Structured, supportive feel" },
];

export async function getMesaMattresses(): Promise<MattressOption[]> {
  const settled = await Promise.allSettled(
    MESA_CONFIGS.map(async (cfg) => {
      const product = await getProductBySlug(cfg.slug);
      if (!product?._id || !product.name) return null;
      const price = product.priceData?.price ?? 0;
      return {
        id: product._id,
        slug: cfg.slug,
        name: product.name,
        comfort: cfg.comfort,
        tagline: cfg.tagline,
        priceText: formatPlpPrice(product),
        unitPriceCents: Math.round(price * 100),
        imageUrl: product.media?.mainMedia?.image?.url ?? undefined,
      } satisfies MattressOption;
    }),
  );

  const results: MattressOption[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled" && r.value !== null) {
      results.push(r.value);
    }
  }
  return results;
}

export function isFutonFrame(slug: string): boolean {
  return slug.includes("futon");
}
