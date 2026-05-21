import type { Metadata } from "next";
import { SHOP_CATEGORIES } from "@/lib/shop/categories";
import {
  ShopTheRoom,
  SHOP_HERO_PHOTO,
  SHOP_HOTSPOT_CONFIGS,
} from "@/components/site/ShopTheRoom";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { twitterFromOpenGraph } from "@/lib/seo/twitter-from-og";
import { MascotCategoryCard } from "@/components/mascot/MascotCategoryCard";
import { getSiteContent } from "@/lib/cms/site-content";

type AnimalKey = "bear" | "fox" | "deer" | "owl";

type CategoryMeta = {
  subtitleFallback: string;
  animal: AnimalKey;
  accent: string;
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  "futon-frames":         { subtitleFallback: "Solid hardwood",  animal: "bear", accent: "#F5C97A" },
  "murphy-cabinet-beds":  { subtitleFallback: "Space-saving",    animal: "deer", accent: "#8BB5C9" },
  "platform-beds":        { subtitleFallback: "Low & modern",    animal: "fox",  accent: "#E8845C" },
  mattresses:             { subtitleFallback: "Made in USA",     animal: "owl",  accent: "#6B8A4A" },
  "mattresses-sale":      { subtitleFallback: "On sale now",     animal: "bear", accent: "#E8C45C" },
};

const DESCRIPTION = "Futon frames, Murphy cabinet beds, platform beds, and mattresses.";

const OPEN_GRAPH = {
  title: "Shop — Carolina Futons",
  description: DESCRIPTION,
  images: [DEFAULT_OG_IMAGE],
};

export const metadata: Metadata = {
  title: "Shop — Carolina Futons",
  description: DESCRIPTION,
  openGraph: OPEN_GRAPH,
  twitter: twitterFromOpenGraph(OPEN_GRAPH),
};

export default async function ShopIndex() {
  const [
    subhead,
    shopTheRoomEyebrow,
    shopTheRoomHeading,
    futonFramesSubtitle,
    murphyBedsSubtitle,
    platformBedsSubtitle,
    mattressesSubtitle,
    mattressesSaleSubtitle,
  ] = await Promise.all([
    getSiteContent("shop.index.subhead", "Pick a category to browse."),
    getSiteContent("shop.shop-the-room.eyebrow", "Shop the room"),
    getSiteContent("shop.shop-the-room.heading", "Or jump straight in"),
    getSiteContent("shop.futon-frames.subtitle", CATEGORY_META["futon-frames"].subtitleFallback),
    getSiteContent("shop.murphy-cabinet-beds.subtitle", CATEGORY_META["murphy-cabinet-beds"].subtitleFallback),
    getSiteContent("shop.platform-beds.subtitle", CATEGORY_META["platform-beds"].subtitleFallback),
    getSiteContent("shop.mattresses.subtitle", CATEGORY_META["mattresses"].subtitleFallback),
    getSiteContent("shop.mattresses-sale.subtitle", CATEGORY_META["mattresses-sale"].subtitleFallback),
  ]);

  const categorySubtitles: Record<string, string> = {
    "futon-frames": futonFramesSubtitle,
    "murphy-cabinet-beds": murphyBedsSubtitle,
    "platform-beds": platformBedsSubtitle,
    mattresses: mattressesSubtitle,
    "mattresses-sale": mattressesSaleSubtitle,
  };

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <h1 className="font-playfair text-3xl font-semibold tracking-tight text-cf-ink">Shop</h1>
        <p className="mt-2 text-cf-muted">{subhead}</p>
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHOP_CATEGORIES.map((category) => {
            const meta = CATEGORY_META[category.slug];
            if (!meta) return null;
            return (
              <li key={category.slug}>
                <MascotCategoryCard
                  title={category.name}
                  subtitle={categorySubtitles[category.slug] ?? meta.subtitleFallback}
                  animal={meta.animal}
                  accent={meta.accent}
                  href={`/shop/${category.slug}`}
                />
              </li>
            );
          })}
        </ul>
      </div>

      {/* cf-delight Phase 3: shop-the-room hotspots over the Monterey
          futon scene — gives a category-list visitor a concrete way to
          jump into a PDP without having to pick a category first. */}
      <ShopTheRoom
        headingId="shop-shop-the-room-heading"
        eyebrow={shopTheRoomEyebrow}
        heading={shopTheRoomHeading}
        heroPhoto={SHOP_HERO_PHOTO}
        hotspotConfigs={SHOP_HOTSPOT_CONFIGS}
      />
    </main>
  );
}
