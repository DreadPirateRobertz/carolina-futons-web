import Link from "next/link";
import { SHOP_CATEGORIES } from "@/lib/shop/categories";
import { HeroReveal } from "@/components/motion/HeroReveal";
import { HeroCarousel, type HeroSlide } from "@/components/site/HeroCarousel";
import { FeaturedProducts } from "@/components/site/FeaturedProducts";
import { listFeaturedProducts } from "@/lib/shop/featured";

// Per-card onset delay for the Shop-by-category cascade. 80ms is at the
// just-noticeable-difference threshold for sequential visual onset (enough
// to read as intentional ordering, not so much that the grid feels sluggish).
// Five categories × 80ms = 400ms total cascade — inside the 500ms vestibular
// tolerance budget for non-essential motion. If this grows past 6–7 cards,
// reduce to ~50ms or switch to parent-level staggerChildren with a capped
// maxStagger.
const CARD_STAGGER_SECONDS = 0.08;

// TODO: replace placeholder URLs with brand assets from public/brand/ once delivered.
const HERO_SLIDES: HeroSlide[] = [
  {
    src: "https://static.wixstatic.com/media/e04e89_cf15142c61714ecfad7852522e0a98e4~mv2.jpg/v1/fit/w_2000,h_2000,q_90/file.jpg",
    alt: "Monterey mission-style hardwood futon in a sunlit living room",
  },
  {
    src: "https://static.wixstatic.com/media/e04e89_cf15142c61714ecfad7852522e0a98e4~mv2.jpg/v1/fit/w_2000,h_2000,q_90/file.jpg",
    alt: "Natural hardwood platform bed in a coastal bedroom",
  },
  {
    src: "https://static.wixstatic.com/media/e04e89_cf15142c61714ecfad7852522e0a98e4~mv2.jpg/v1/fit/w_2000,h_2000,q_90/file.jpg",
    alt: "Murphy cabinet bed open in a home office, transforming the space",
  },
];

export default async function HomePage() {
  const featured = await listFeaturedProducts();
  return (
    <>
      <section className="bg-cf-cream">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24 lg:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cf-cta">
              Family owned since 1991
            </p>
            <HeroReveal>
              <h1 className="mt-4 font-heading text-4xl font-bold uppercase leading-[1.05] tracking-tight text-cf-navy sm:text-5xl md:text-6xl">
                Quality futons &amp; furniture for your home
              </h1>
            </HeroReveal>
            <HeroReveal delay={0.15}>
              <p className="mt-5 max-w-xl text-lg text-cf-charcoal/80">
                Hendersonville, NC. Hardwood frames built by hand, mattresses
                we actually sleep on, and shipping that shows up.
              </p>
            </HeroReveal>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-flex h-12 items-center justify-center rounded-md bg-cf-cta px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Shop everything
              </Link>
              <Link
                href="/shop/futon-frames"
                className="inline-flex h-12 items-center justify-center rounded-md border border-cf-navy px-6 text-sm font-medium text-cf-navy transition-colors hover:bg-cf-navy hover:text-cf-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Browse futons
              </Link>
            </div>
          </div>
          <HeroCarousel slides={HERO_SLIDES} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <HeroReveal>
          <div className="flex items-end justify-between gap-6">
            <h2 className="font-heading text-2xl font-semibold text-cf-navy sm:text-3xl">
              Shop by category
            </h2>
            <Link
              href="/shop"
              className="text-sm font-medium text-cf-cta hover:underline"
            >
              View all →
            </Link>
          </div>
        </HeroReveal>
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHOP_CATEGORIES.map((category, i) => (
            <li key={category.slug}>
              {/* whileInView fires once (no replay on scroll-back); reduced-motion
                  users land on the final state via HeroReveal's internal guard.
                  See CARD_STAGGER_SECONDS comment above for the why behind 80ms. */}
              <HeroReveal delay={i * CARD_STAGGER_SECONDS}>
                <Link
                  href={`/shop/${category.slug}`}
                  className="group flex h-full flex-col justify-between rounded-lg border border-cf-divider bg-white p-6 transition-colors hover:border-cf-navy"
                >
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-cf-navy">
                      {category.name}
                    </h3>
                    <p className="mt-2 text-sm text-cf-charcoal/80">
                      {category.description}
                    </p>
                  </div>
                  <span className="mt-6 text-sm font-medium text-cf-cta group-hover:underline">
                    Browse {category.name.toLowerCase()} →
                  </span>
                </Link>
              </HeroReveal>
            </li>
          ))}
        </ul>
      </section>

      <FeaturedProducts products={featured} />

      <section className="border-t border-cf-divider bg-cf-sand/40">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-14 sm:grid-cols-3 sm:px-6 lg:px-8">
          {VALUE_PROPS.map((prop) => (
            <div
              key={prop.title}
              className="rounded-lg border border-cf-divider bg-cf-cream p-6 shadow-sm"
            >
              <h3 className="font-heading text-base font-semibold text-cf-navy">
                {prop.title}
              </h3>
              <p className="mt-2 text-sm text-cf-charcoal/80">
                {prop.body}
              </p>
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
