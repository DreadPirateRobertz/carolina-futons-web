import type { Metadata } from "next";
import { SHOP_CATEGORIES } from "@/lib/shop/categories";
import {
  ShopTheRoom,
  SHOP_HERO_PHOTO,
  SHOP_HOTSPOT_CONFIGS,
} from "@/components/site/ShopTheRoom";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { MascotCategoryCard } from "@/components/mascot/MascotCategoryCard";

type AnimalKey = "bear" | "fox" | "deer" | "owl";

type CategoryMeta = {
  subtitle: string;
  animal: AnimalKey;
  accent: string;
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  "futon-frames":         { subtitle: "Solid hardwood",  animal: "bear", accent: "#F5C97A" },
  "murphy-cabinet-beds":  { subtitle: "Space-saving",    animal: "deer", accent: "#8BB5C9" },
  "platform-beds":        { subtitle: "Low & modern",    animal: "fox",  accent: "#E8845C" },
  mattresses:             { subtitle: "Made in USA",     animal: "owl",  accent: "#6B8A4A" },
  "mattresses-sale":      { subtitle: "On sale now",     animal: "bear", accent: "#E8C45C" },
};

const DESCRIPTION = "Futon frames, Murphy cabinet beds, platform beds, and mattresses.";

export const metadata: Metadata = {
  title: "Shop — Carolina Futons",
  description: DESCRIPTION,
  openGraph: {
    title: "Shop — Carolina Futons",
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default async function ShopIndex() {
  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <h1 className="font-playfair text-3xl font-semibold tracking-tight text-cf-ink">Shop</h1>
        <p className="mt-2 text-cf-muted">Pick a category to browse.</p>
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHOP_CATEGORIES.map((category) => {
            const meta = CATEGORY_META[category.slug];
            if (!meta) return null;
            return (
              <li key={category.slug}>
                <MascotCategoryCard
                  title={category.name}
                  subtitle={meta.subtitle}
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
        eyebrow="Shop the room"
        heading="Or jump straight in"
        heroPhoto={SHOP_HERO_PHOTO}
        hotspotConfigs={SHOP_HOTSPOT_CONFIGS}
      />
    </main>
  );
}
