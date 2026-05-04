import type { Metadata } from "next";

import {
  FilterFirst,
  type ThemeDCategory,
} from "@/components/theme-d/FilterFirst";
import {
  getCollectionBySlug,
  listProductsByCollectionId,
} from "@/lib/wix/products";

// Theme D preview — Fontshare Minimal / filter-first browse experience.
// The FilterFirst component is also embedded in the main / home page; this
// route isolates it so Stilgar can compare it side-by-side with A/B/C.

export const metadata: Metadata = {
  title: "Theme D — Fontshare Minimal (preview)",
  robots: { index: false, follow: false },
};

const FONTSHARE_URL =
  "https://api.fontshare.com/v2/css?f[]=clash-display@700&f[]=satoshi@400,500&display=swap";

const FILTER_CATEGORIES = [
  { slug: "futon-frames", collectionSlug: "futon-frames", label: "Futon Frames" },
  { slug: "murphy-cabinet-beds", collectionSlug: "murphy-cabinet-beds", label: "Murphy Beds" },
  { slug: "platform-beds", collectionSlug: "platform-beds", label: "Platform Beds" },
  { slug: "mattresses", collectionSlug: "mattresses", label: "Mattresses" },
] as const;

export default async function ThemeDPage() {
  const categories = await Promise.all(
    FILTER_CATEGORIES.map(async (cat): Promise<ThemeDCategory> => {
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
      <FilterFirst categories={categories} />
    </>
  );
}
