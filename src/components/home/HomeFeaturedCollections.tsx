import Image from "next/image";
import Link from "next/link";

import { SHOP_CATEGORIES } from "@/lib/shop/categories";

const FEATURED_SLUGS = [
  "futon-frames",
  "murphy-cabinet-beds",
  "platform-beds",
  "mattresses",
] as const;

export function HomeFeaturedCollections() {
  const featured = SHOP_CATEGORIES.filter((c) =>
    (FEATURED_SLUGS as readonly string[]).includes(c.slug),
  );

  return (
    <section
      aria-labelledby="home-collections-heading"
      className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
    >
      <h2
        id="home-collections-heading"
        className="font-playfair text-2xl font-semibold tracking-tight text-cf-espresso sm:text-3xl"
      >
        Shop by category
      </h2>

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {featured.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/shop/${category.slug}`}
              className="group block overflow-hidden rounded-lg border border-cf-divider bg-white shadow-sm transition hover:shadow-md dark:bg-cf-cream"
              aria-label={`Shop ${category.name}`}
            >
              <div className="relative aspect-[3/2] overflow-hidden bg-cf-sand/30">
                {category.image ? (
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    unoptimized
                  />
                ) : (
                  <div className="h-full w-full bg-cf-sand" />
                )}
              </div>
              <div className="px-3 py-3 sm:px-4 sm:py-4">
                <h3 className="font-playfair text-sm font-semibold text-cf-espresso sm:text-base">
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
