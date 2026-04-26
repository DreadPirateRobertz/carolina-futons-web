import Link from "next/link";
import { SHOP_CATEGORIES } from "@/lib/shop/categories";
import { HeroReveal } from "@/components/motion/HeroReveal";
import { HeroWordStagger } from "@/components/motion/HeroWordStagger";
import { HeroCarousel, type HeroSlide } from "@/components/site/HeroCarousel";
import { FeaturedProducts } from "@/components/site/FeaturedProducts";
import { listFeaturedProducts } from "@/lib/shop/featured";
import { StatsStrip } from "@/components/site/StatsStrip";
import { TestimonialsStrip } from "@/components/site/TestimonialsStrip";
import { TrustBar } from "@/components/site/TrustBar";
import { CategoryCardImage } from "@/components/site/CategoryCardImage";
import { HeroParallax } from "@/components/site/HeroParallax";
import { EmailCapturePopup } from "@/components/site/EmailCapturePopup";
import {
  ShopTheRoom,
  HOME_HERO_PHOTO,
  HOME_HOTSPOT_CONFIGS,
} from "@/components/site/ShopTheRoom";
import { LivingSky } from "@/components/illustrations/LivingSky";

// Per-card onset delay for the Shop-by-category cascade. 80ms is at the
// just-noticeable-difference threshold for sequential visual onset (enough
// to read as intentional ordering, not so much that the grid feels sluggish).
// Five categories × 80ms = 400ms total cascade — inside the 500ms vestibular
// tolerance budget for non-essential motion. If this grows past 6–7 cards,
// reduce to ~50ms or switch to parent-level staggerChildren with a capped
// maxStagger.
const CARD_STAGGER_SECONDS = 0.08;

export const HERO_SLIDES: HeroSlide[] = [
  {
    src: "https://static.wixstatic.com/media/e04e89_72d82110638045c39e0f6274363c15f8~mv2.jpg/v1/fill/w_1920,h_1080,q_90/file.jpg",
    alt: "Monterey mission-style hardwood futon in a sunlit living room",
  },
  {
    src: "https://static.wixstatic.com/media/e04e89_b9d4cf76a1a84bf5bb4821edc53f6df2~mv2.jpg/v1/fill/w_1920,h_1080,q_90/file.jpg",
    alt: "Natural hardwood platform bed in a coastal bedroom",
  },
  {
    src: "https://static.wixstatic.com/media/e04e89_818d75df410a41e1a0721207333bc93d~mv2.jpg/v1/fill/w_1920,h_1080,q_90/file.jpg",
    alt: "Murphy cabinet bed open in a home office, transforming the space",
  },
];

export default async function HomePage() {
  const featured = await listFeaturedProducts();
  return (
    <>
      <EmailCapturePopup />
      <section className="bg-cf-cream">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24 lg:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cf-cta">
              Family owned since 1991
            </p>
            <h1 className="mt-4 font-heading text-4xl font-bold uppercase leading-[1.05] tracking-tight text-cf-navy sm:text-5xl md:text-6xl">
              <HeroWordStagger text="Quality futons & furniture for your home" />
            </h1>
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
          <HeroParallax>
            <HeroCarousel slides={HERO_SLIDES} />
          </HeroParallax>
        </div>
      </section>

      {/* cf-93rb Phase A: atmospheric Blue Ridge band between hero and the
          TrustBar — anchors the page in place (Hendersonville, NC) and
          breaks up the previously-flat cream → trust-bar transition. */}
      <LivingSky />

      <TrustBar />

      <ShopTheRoom
        heroPhoto={HOME_HERO_PHOTO}
        hotspotConfigs={HOME_HOTSPOT_CONFIGS}
      />

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
                  className="group flex h-full flex-col overflow-hidden rounded-lg border border-cf-divider bg-white transition-colors hover:border-cf-navy"
                >
                  {category.image && (
                    <div className="relative aspect-[3/2] w-full overflow-hidden">
                      <CategoryCardImage
                        src={category.image}
                        slug={category.slug}
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col justify-between p-6">
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
                  </div>
                </Link>
              </HeroReveal>
            </li>
          ))}
        </ul>
      </section>

      <FeaturedProducts products={featured} />

      <StatsStrip />

      <TestimonialsStrip />

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
