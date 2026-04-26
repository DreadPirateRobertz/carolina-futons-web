import type { Metadata } from "next";
import Link from "next/link";

import { SHOP_CATEGORIES } from "@/lib/shop/categories";
import { listFeaturedProducts } from "@/lib/shop/featured";
import { MrPopsHero } from "@/components/theme-a/MrPopsHero";
import { MrPopsMarquee } from "@/components/site/MrPopsMarquee";
import { FeaturedProducts } from "@/components/site/FeaturedProducts";
import { TestimonialsStrip } from "@/components/site/TestimonialsStrip";
import { StatsStrip } from "@/components/site/StatsStrip";
import { CategoryCardImage } from "@/components/site/CategoryCardImage";

// Theme A preview route — 'Mr Pops Playful'.
// Not linked from the main site. Access at /theme-a for design review.
// Shares the main app layout (header, footer) so real navigation works.

export const metadata: Metadata = {
  title: "Theme A — Mr Pops Playful Preview",
  robots: { index: false, follow: false },
};

export default async function ThemeAPage() {
  const featured = await listFeaturedProducts();
  return (
    <>
      {/* Signature full-screen sky hero with kinetic word stagger */}
      <MrPopsHero />

      {/* Three-row beauty-shot marquee — visual punch right below the fold */}
      <MrPopsMarquee />

      {/* Shop-by-category grid — warm espresso card borders */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="font-heading text-2xl font-semibold text-cf-espresso sm:text-3xl">
          Shop by category
        </h2>
        <div className="mt-1 h-0.5 w-10 bg-cf-espresso/30" aria-hidden="true" />
        <ul
          data-testid="shop-categories-theme-a"
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {SHOP_CATEGORIES.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/shop/${category.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border-2 border-cf-espresso/15 bg-white transition-colors hover:border-cf-espresso/40"
              >
                {category.image && (
                  <div className="relative aspect-[3/2] w-full overflow-hidden">
                    <CategoryCardImage src={category.image} slug={category.slug} />
                  </div>
                )}
                <div className="flex flex-1 flex-col justify-between p-6">
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-cf-espresso">
                      {category.name}
                    </h3>
                    <p className="mt-2 text-sm text-cf-charcoal/75">
                      {category.description}
                    </p>
                  </div>
                  <span className="mt-6 text-sm font-semibold text-cf-espresso group-hover:underline">
                    Browse {category.name.toLowerCase()} →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <FeaturedProducts products={featured} />

      <StatsStrip />

      <TestimonialsStrip />

      {/* Value props — warm espresso-tinted cards */}
      <section className="border-t border-cf-espresso/10 bg-cf-cream">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-14 sm:grid-cols-3 sm:px-6 lg:px-8">
          {VALUE_PROPS.map((prop) => (
            <div
              key={prop.title}
              className="rounded-xl border border-cf-espresso/15 bg-white p-6 shadow-sm"
            >
              <h3 className="font-heading text-base font-semibold text-cf-espresso">
                {prop.title}
              </h3>
              <p className="mt-2 text-sm text-cf-charcoal/75">{prop.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

const VALUE_PROPS = [
  {
    title: "Hardwood, not plywood",
    body: "Frames milled from solid oak, maple, and cherry. Built to outlive the apartment they ship to.",
  },
  {
    title: "Sleep on it first",
    body: "Visit the Hendersonville showroom and try every mattress we sell. No commission pressure.",
  },
  {
    title: "White-glove delivery",
    body: "Regional delivery teams set it up where you want it. Not on a curb in a box.",
  },
];
