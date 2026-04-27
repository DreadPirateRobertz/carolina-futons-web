// Fetches the three Mesa mattress options for the futon PDP bundle panel
// (cf-h1i4). Products that fail to resolve are omitted; a full Wix outage
// returns { items: [], error: "wix_sdk" } so callers can distinguish outage
// from legitimate empty configuration.
import "server-only";

import { getProductBySlug } from "@/lib/wix/products";
import { logWixFailure } from "@/lib/wix/errors";
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

export type MesaMattressResult = {
  items: MattressOption[];
  error?: "wix_sdk" | "unexpected";
};

export async function getMesaMattresses(): Promise<MesaMattressResult> {
  let settled: PromiseSettledResult<MattressOption | null>[];
  try {
    settled = await Promise.allSettled(
      MESA_CONFIGS.map(async (cfg) => {
        const product = await getProductBySlug(cfg.slug);
        if (!product?._id || !product.name) return null;
        const price = product.priceData?.price ?? 0;
        const rawUrl = product.media?.mainMedia?.image?.url;
        const imageUrl = rawUrl?.startsWith("https://") ? rawUrl : undefined;
        return {
          id: product._id,
          slug: cfg.slug,
          name: product.name,
          comfort: cfg.comfort,
          tagline: cfg.tagline,
          priceText: formatPlpPrice(product),
          unitPriceCents: Math.round(price * 100),
          imageUrl,
        } satisfies MattressOption;
      }),
    );
  } catch (err) {
    await logWixFailure("getMesaMattresses", "Promise.allSettled", err);
    return { items: [], error: "unexpected" };
  }

  const items: MattressOption[] = [];
  let rejectedCount = 0;
  for (const r of settled) {
    if (r.status === "fulfilled" && r.value !== null) {
      items.push(r.value);
    } else if (r.status === "rejected") {
      rejectedCount++;
    }
  }

  if (items.length === 0 && rejectedCount > 0) {
    await logWixFailure("getMesaMattresses", "all products rejected", { rejectedCount });
    return { items: [], error: "wix_sdk" };
  }

  return { items };
}

// Matches only dedicated futon frame slugs — excludes futon covers, mattresses, etc.
export function isFutonFrame(slug: string): boolean {
  return slug.endsWith("-futon-frame");
}
