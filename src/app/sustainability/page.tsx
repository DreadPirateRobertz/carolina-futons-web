import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sustainability — Carolina Futons",
  description:
    "How Carolina Futons builds furniture that lasts decades — responsibly sourced wood, low-VOC finishes, durable construction, and a trade-in program.",
};

// Story rows + hero ported from Wix Studio Sustainability.js +
// public/sustainabilityHelpers.getMaterialHighlights / getCertificationsList.
// Static for phase 1; CMS-backed `Sustainability` collection arrives once
// rennala finishes the content schema for /sustainability.
const HERO = {
  eyebrow: "Our promise",
  heading: "Furniture that cares for the planet",
  intro:
    "At Carolina Futons, sustainability isn’t a buzzword — it’s how we build. From responsibly sourced wood to low-VOC finishes, every piece is crafted to last decades, not seasons.",
} as const;

type StoryRow = {
  heading: string;
  body: string;
  imageAlt: string;
};

const STORY_ROWS: readonly StoryRow[] = [
  {
    heading: "Sustainably sourced wood",
    body:
      "Our frames use plantation-grown rubberwood and responsibly harvested hardwoods — never old-growth timber. We can trace every board back to a managed forest.",
    imageAlt: "Stack of responsibly sourced hardwood lumber at the workshop",
  },
  {
    heading: "Eco-friendly finishes",
    body:
      "Water-based stains and low-VOC finishes protect indoor air quality and reduce environmental impact. The frame you bring home shouldn’t off-gas for months.",
    imageAlt: "Craftsperson applying a water-based finish to a futon frame",
  },
  {
    heading: "Natural fabrics",
    body:
      "Organic cotton, linen, and recycled polyester covers that are better for you and the planet — and easier to launder when life happens.",
    imageAlt: "Folded organic cotton and linen fabric swatches",
  },
  {
    heading: "Durable by design",
    body:
      "Built to last 15–20 years of daily use. The most sustainable piece of furniture is the one you don’t have to replace, so we engineer for repair, not landfill.",
    imageAlt: "Hand-tightened bolt on a solid hardwood futon frame joint",
  },
] as const;

type Certification = {
  name: string;
  body: string;
};

const CERTIFICATIONS: readonly Certification[] = [
  {
    name: "FSC Certified",
    body:
      "Forest Stewardship Council certification ensures our wood comes from responsibly managed forests.",
  },
  {
    name: "GREENGUARD Gold",
    body:
      "Strict chemical-emissions limits for healthier indoor air — verified by an independent lab.",
  },
  {
    name: "CertiPUR-US",
    body:
      "Foam meets rigorous standards for content, emissions, and durability — no harmful chemicals.",
  },
] as const;

export default function SustainabilityPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="max-w-[65ch] space-y-3 font-source-sans">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
          {HERO.eyebrow}
        </p>
        <h1 className="font-playfair text-4xl font-semibold tracking-tight text-cf-ink sm:text-5xl">
          {HERO.heading}
        </h1>
        <p className="text-lg leading-relaxed text-cf-muted">{HERO.intro}</p>
      </header>

      <section
        aria-labelledby="story-rows-heading"
        className="mt-14 space-y-10"
        data-slot="sustainability-stories"
      >
        <h2
          id="story-rows-heading"
          className="font-playfair text-2xl font-semibold tracking-tight text-cf-ink"
        >
          How we build it
        </h2>
        <ul className="space-y-10">
          {STORY_ROWS.map((row) => (
            <li
              key={row.heading}
              className="grid items-start gap-6 sm:grid-cols-[180px_1fr]"
            >
              <div
                role="img"
                aria-label={row.imageAlt}
                className="aspect-[4/3] w-full rounded-md bg-cf-sand/60"
              />
              <div className="space-y-2">
                <h3 className="font-playfair text-xl font-semibold tracking-tight text-cf-ink">
                  {row.heading}
                </h3>
                <p className="leading-relaxed text-cf-muted">{row.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="certifications-heading"
        className="mt-16 space-y-6"
      >
        <h2
          id="certifications-heading"
          className="font-playfair text-2xl font-semibold tracking-tight text-cf-ink"
        >
          Certifications &amp; standards
        </h2>
        <p className="max-w-[65ch] text-cf-muted">
          Our products meet rigorous third-party environmental and safety
          standards.
        </p>
        <ul className="grid gap-4 sm:grid-cols-3">
          {CERTIFICATIONS.map((cert) => (
            <li
              key={cert.name}
              className="rounded-md border border-cf-divider bg-white/60 p-4"
            >
              <p className="font-medium text-cf-ink">{cert.name}</p>
              <p className="mt-2 text-sm text-cf-muted">{cert.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="trade-in-heading"
        className="mt-16 rounded-lg border border-cf-divider bg-cf-sand/40 p-8"
      >
        <h2
          id="trade-in-heading"
          className="font-playfair text-2xl font-semibold tracking-tight text-cf-ink"
        >
          Trade-in program
        </h2>
        <p className="mt-3 max-w-[65ch] text-cf-muted">
          Give your old futon a second life. Trade in your used furniture for
          store credit toward a new piece — we’ll handle the pickup and
          responsible recycling.
        </p>
        <p className="mt-6">
          <Link
            href="/contact"
            className="inline-flex h-11 items-center justify-center rounded-md bg-cf-cta px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Ask about trade-in
          </Link>
        </p>
      </section>
    </main>
  );
}
