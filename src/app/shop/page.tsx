import Link from "next/link";
import type { Metadata } from "next";
import { SHOP_CATEGORIES } from "@/lib/shop/categories";
import {
  ShopTheRoom,
  SHOP_HERO_PHOTO,
  SHOP_HOTSPOT_CONFIGS,
} from "@/components/site/ShopTheRoom";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { FutonsCategory } from "@/components/illustrations/FutonsCategory";
import { MurphyCategory } from "@/components/illustrations/MurphyCategory";
import { PlatformCategory } from "@/components/illustrations/PlatformCategory";
import { MattressesCategory } from "@/components/illustrations/MattressesCategory";
import type { ComponentType } from "react";
import type { Season } from "@/components/illustrations/botanical";
import { getCurrentSeason } from "@/components/illustrations/botanical";

type CategoryIllus = ComponentType<{ season?: Season; className?: string; instanceKey?: string }>;

const CATEGORY_ILLUSTRATION: Record<string, CategoryIllus> = {
  "futon-frames": FutonsCategory,
  "murphy-cabinet-beds": MurphyCategory,
  "platform-beds": PlatformCategory,
  mattresses: MattressesCategory,
  "mattresses-sale": MattressesCategory,
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
  const season = getCurrentSeason();
  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight dark:text-zinc-100">Shop</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">Pick a category to browse.</p>
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHOP_CATEGORIES.map((category) => {
            const Illus = CATEGORY_ILLUSTRATION[category.slug];
            return (
              <li
                key={category.slug}
                className="overflow-hidden rounded-lg border border-zinc-200 hover:border-zinc-400 focus-within:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500 dark:focus-within:border-zinc-500"
              >
                {Illus && (
                  <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-50 dark:bg-zinc-800">
                    <Illus season={season} instanceKey={category.slug} />
                  </div>
                )}
                <Link
                  href={`/shop/${category.slug}`}
                  className="block p-5 focus:outline-none"
                >
                  <h2 className="text-lg font-semibold dark:text-zinc-100">{category.name}</h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {category.description}
                  </p>
                </Link>
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
