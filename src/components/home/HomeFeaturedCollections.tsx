import { findCategory } from "@/lib/shop/categories";
import { MascotCategoryCard } from "@/components/mascot/MascotCategoryCard";

export const FEATURED_CATEGORY_SLUGS = [
  "futon-frames",
  "murphy-cabinet-beds",
  "platform-beds",
  "mattresses",
] as const;

type AnimalKey = "bear" | "fox" | "deer" | "owl";

const CATEGORY_META: Record<string, { subtitle: string; animal: AnimalKey; accent: string }> = {
  "futon-frames":        { subtitle: "Solid hardwood", animal: "bear", accent: "#F5C97A" },
  "murphy-cabinet-beds": { subtitle: "Space-saving",   animal: "deer", accent: "#8BB5C9" },
  "platform-beds":       { subtitle: "Low & modern",   animal: "fox",  accent: "#E8845C" },
  mattresses:            { subtitle: "Made in USA",    animal: "owl",  accent: "#6B8A4A" },
};

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
        {featured.map((category) => {
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
    </section>
  );
}
