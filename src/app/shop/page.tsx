import Link from "next/link";
import type { Metadata } from "next";
import { SHOP_CATEGORIES } from "@/lib/shop/categories";
import {
  ShopTheRoom,
  SHOP_HERO_PHOTO,
  SHOP_HOTSPOT_CONFIGS,
} from "@/components/site/ShopTheRoom";
import { DEFAULT_OG_IMAGE } from "@/lib/og";

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
        <h1 className="text-3xl font-semibold tracking-tight">Shop</h1>
        <p className="mt-2 text-zinc-600">Pick a category to browse.</p>
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHOP_CATEGORIES.map((category) => (
            <li
              key={category.slug}
              className="rounded-lg border border-zinc-200 p-5 hover:border-zinc-400"
            >
              <Link
                href={`/shop/${category.slug}`}
                className="block focus:outline-none"
              >
                <h2 className="text-lg font-semibold">{category.name}</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {category.description}
                </p>
              </Link>
            </li>
          ))}
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
