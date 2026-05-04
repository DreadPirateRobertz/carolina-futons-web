import Link from "next/link";

import { findCategory } from "@/lib/shop/categories";
import { CategoryCardImage } from "@/components/site/CategoryCardImage";

export const FEATURED_CATEGORY_SLUGS = [
  "futon-frames",
  "murphy-cabinet-beds",
  "platform-beds",
  "mattresses",
] as const;

export function HomeFeaturedCollections() {
  const featured = FEATURED_CATEGORY_SLUGS.map((slug) => findCategory(slug)).filter(
    (c) => c !== undefined,
  );

  if (process.env.NODE_ENV !== "production" && featured.length < FEATURED_CATEGORY_SLUGS.length) {
    console.warn(
      `[HomeFeaturedCollections] ${FEATURED_CATEGORY_SLUGS.length - featured.length} featured slug(s) not found in SHOP_CATEGORIES`,
    );
  }

  return (
    <section
      aria-labelledby="home-collections-heading"
      className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
    >
      <h2
        id="home-collections-heading"
        className="font-heading text-2xl font-semibold tracking-tight text-cf-espresso sm:text-3xl"
      >
        Shop by category
      </h2>

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {featured.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/shop/${category.slug}`}
              className="group block overflow-hidden rounded-lg border border-cf-divider bg-cf-cream shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="relative aspect-[3/2] overflow-hidden bg-cf-sand/30">
                {category.image ? (
                  <CategoryCardImage src={category.image} slug={category.slug} />
                ) : (
                  <div className="h-full w-full bg-cf-sand" />
                )}
              </div>
              <div className="px-3 py-3 sm:px-4 sm:py-4">
                <h3 className="font-heading text-sm font-semibold text-cf-espresso sm:text-base">
                  {category.name}
                </h3>
                <p className="mt-0.5 text-xs text-cf-charcoal/70 line-clamp-2">
                  {category.description}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
