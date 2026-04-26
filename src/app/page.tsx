import type { Metadata } from "next";

import { MrPopsHero } from "@/components/theme-a/MrPopsHero";
import { MrPopsMarquee } from "@/components/site/MrPopsMarquee";
import { AdGrid, type AdCategory } from "@/components/theme-ad/AdGrid";
import {
  ShopTheRoom,
  HOME_HERO_PHOTO,
  HOME_HOTSPOT_CONFIGS,
} from "@/components/site/ShopTheRoom";
import {
  getCollectionBySlug,
  listProductsByCollectionId,
} from "@/lib/wix/products";

export const metadata: Metadata = {
  title: "Carolina Futons — Hardwood Frames & Mattresses | Hendersonville, NC",
  description:
    "Family-owned since 1991. Solid hardwood futon frames, natural mattresses, Murphy beds, and platform beds. Visit our Hendersonville, NC showroom or shop online.",
};

// Fontshare: Clash Display (heading) + Satoshi (body).
// Loaded here so they scope to this theme and don't bloat the global layout.
const FONTSHARE_URL =
  "https://api.fontshare.com/v2/css?f[]=clash-display@700&f[]=satoshi@400,500&display=swap";

const FILTER_CATEGORIES = [
  { slug: "futon-frames", collectionSlug: "futon-frames", label: "Futon Frames" },
  { slug: "murphy-cabinet-beds", collectionSlug: "murphy-cabinet-beds", label: "Murphy Beds" },
  { slug: "platform-beds", collectionSlug: "platform-beds", label: "Platform Beds" },
  { slug: "mattresses", collectionSlug: "mattresses", label: "Mattresses" },
] as const;

export default async function HomePage() {
  const categories = await Promise.all(
    FILTER_CATEGORIES.map(async (cat): Promise<AdCategory> => {
      const collection = await getCollectionBySlug(cat.collectionSlug);
      const products = collection?._id
        ? await listProductsByCollectionId(collection._id, 24)
        : [];
      return { slug: cat.slug, label: cat.label, products };
    }),
  );

  return (
    <>
      <link rel="preconnect" href="https://api.fontshare.com" />
      <link rel="stylesheet" href={FONTSHARE_URL} />
      {/* Clash Display + Satoshi scoped to ad-grid-shell — global heading font unchanged */}
      <style>{`
        .ad-grid-shell h2 {
          font-family: 'Clash Display', var(--font-heading), sans-serif;
        }
        .ad-grid-shell p,
        .ad-grid-shell button {
          font-family: 'Satoshi', var(--font-sans), sans-serif;
        }
        /* Product card name: tighter tracking at small size for Clash Display */
        .ad-grid-shell [data-slot="product-card"] h2 {
          letter-spacing: -0.025em;
        }
      `}</style>

      <MrPopsHero />
      <MrPopsMarquee />
      <AdGrid categories={categories} />
      <ShopTheRoom
        heroPhoto={HOME_HERO_PHOTO}
        hotspotConfigs={HOME_HOTSPOT_CONFIGS}
      />
    </>
  );
}
