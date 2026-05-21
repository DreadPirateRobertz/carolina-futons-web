import type { Metadata } from "next";
import Link from "next/link";

import { listCollectionItems, type WixDataItem } from "@/lib/wix/data";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSiteContent } from "@/lib/cms/site-content";

export const metadata: Metadata = {
  title: "Sustainability — Carolina Futons",
  description:
    "How Carolina Futons builds furniture that lasts decades — responsibly sourced wood, low-VOC finishes, durable construction, and a trade-in program.",
};

// ── CMS types ──────────────────────────────────────────────────────

type SustainabilityStoryItem = WixDataItem & {
  heading: string;
  body: string;
  imageUrl?: string;
  imageAlt?: string;
  sortOrder?: number;
};

type SustainabilityCertItem = WixDataItem & {
  name: string;
  body: string;
  sortOrder?: number;
};

type MaterialItem = WixDataItem & {
  title: string;
  description: string;
  imageUrl?: string;
  imageAlt?: string;
  sortOrder?: number;
};

// ── Local types ─────────────────────────────────────────────────────

type StoryRow = { heading: string; body: string; imageAlt: string };
type Certification = { name: string; body: string };
type Material = { title: string; description: string; imageAlt: string; imageUrl?: string };

// ── Static fallbacks ────────────────────────────────────────────────

const STORY_ROWS_FALLBACK: readonly StoryRow[] = [
  {
    heading: "Sustainably sourced wood",
    body: "Our frames use plantation-grown rubberwood and responsibly harvested hardwoods — never old-growth timber. We can trace every board back to a managed forest.",
    imageAlt: "Stack of responsibly sourced hardwood lumber at the workshop",
  },
  {
    heading: "Eco-friendly finishes",
    body: "Water-based stains and low-VOC finishes protect indoor air quality and reduce environmental impact. The frame you bring home shouldn't off-gas for months.",
    imageAlt: "Craftsperson applying a water-based finish to a futon frame",
  },
  {
    heading: "Natural fabrics",
    body: "Organic cotton, linen, and recycled polyester covers that are better for you and the planet — and easier to launder when life happens.",
    imageAlt: "Folded organic cotton and linen fabric swatches",
  },
  {
    heading: "Durable by design",
    body: "Built to last 15–20 years of daily use. The most sustainable piece of furniture is the one you don't have to replace, so we engineer for repair, not landfill.",
    imageAlt: "Hand-tightened bolt on a solid hardwood futon frame joint",
  },
] as const;

const CERTIFICATIONS_FALLBACK: readonly Certification[] = [
  {
    name: "FSC Certified",
    body: "Forest Stewardship Council certification ensures our wood comes from responsibly managed forests.",
  },
  {
    name: "GREENGUARD Gold",
    body: "Strict chemical-emissions limits for healthier indoor air — verified by an independent lab.",
  },
  {
    name: "CertiPUR-US",
    body: "Foam meets rigorous standards for content, emissions, and durability — no harmful chemicals.",
  },
] as const;

const MATERIALS_FALLBACK: readonly Material[] = [
  {
    title: "Plantation rubberwood",
    description: "Harvested from rubber trees at the end of their latex-producing life. Dense grain, minimal waste.",
    imageAlt: "Close-up of rubberwood grain on a finished futon frame",
  },
  {
    title: "Solid hardwood",
    description: "Oak, maple, and cherry sourced from FSC-certified North American forests. No MDF, no veneer.",
    imageAlt: "Stacked hardwood boards at our manufacturing partner",
  },
  {
    title: "Organic cotton batting",
    description: "GOTS-certified organic cotton fill in our natural mattress line. No synthetic pesticides in the supply chain.",
    imageAlt: "Natural cotton batting layer inside a mattress cross-section",
  },
  {
    title: "Recycled steel hardware",
    description: "Bolts, brackets, and sliders use post-industrial recycled steel wherever structural requirements allow.",
    imageAlt: "Recycled steel bolts and hardware components",
  },
  {
    title: "Low-VOC water-based finishes",
    description: "All stains and topcoats pass GREENGUARD Gold emission limits. No solvent-based lacquers in our finishing line.",
    imageAlt: "Water-based finish being applied to a futon frame",
  },
  {
    title: "Natural latex",
    description: "Dunlop latex from FSC-certified rubber plantations in our premium mattress cores. Naturally antimicrobial.",
    imageAlt: "Natural latex mattress core cross-section showing open-cell structure",
  },
] as const;

const TRADE_IN_STEPS = [
  {
    step: "1",
    title: "Request an estimate",
    description:
      "Tell us what you have — category, approximate condition, and a photo if you can. We'll give you a credit range within one business day.",
  },
  {
    step: "2",
    title: "Schedule free pickup",
    description:
      "Our regional delivery team picks up your old piece at no charge within our delivery zone. No need to haul it yourself.",
  },
  {
    step: "3",
    title: "Shop with store credit",
    description:
      "Credit is applied to your next purchase — $50–$200 depending on category and condition. No expiration date.",
  },
] as const;

// cfw-p3j: owner-editable marketing copy. Wix-CMS-backed repeaters
// (story rows, materials, certifications) and structural step content
// (TRADE_IN_STEPS) are excluded per §3 — structural/dynamic content.
const SUSTAINABILITY_COPY_FALLBACKS = {
  eyebrow: "Our promise",
  introHeading: "Furniture that cares for the planet",
  introBody:
    "At Carolina Futons, sustainability isn't a buzzword — it's how we build. From responsibly sourced wood to low-VOC finishes, every piece is crafted to last decades, not seasons.",
  storiesHeading: "How we build it",
  materialsHeading: "What we use",
  materialsSubhead:
    "Every material is chosen for durability, low environmental impact, and how it performs in daily life.",
  carbonHeading: "Carbon offset program",
  carbonBody:
    "Manufacturing and shipping any physical product has a carbon footprint. We don't pretend otherwise. For every order shipped, we contribute to reforestation projects in the Southern Appalachians — the same mountains where our showroom sits.",
  certsHeading: "Certifications & standards",
  certsSubhead:
    "Our products meet rigorous third-party environmental and safety standards.",
  tradeinHeading: "Trade-in program",
  tradeinSubhead:
    "Give your old futon a second life. Trade in your used furniture for store credit toward a new piece — we'll handle the pickup and responsible recycling.",
  tradeinCtaLabel: "Ask about trade-in",
} as const;

// ── CMS fetchers with static fallbacks ─────────────────────────────

async function getStoryRows(): Promise<StoryRow[]> {
  try {
    const items = await listCollectionItems<SustainabilityStoryItem>(
      "SustainabilityStory",
      20,
    );
    if (items.length > 0) {
      return [...items]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((item) => ({
          heading: item.heading,
          body: item.body,
          imageAlt: item.imageAlt ?? item.heading,
        }));
    }
  } catch {
    // fall through to static data
  }
  return [...STORY_ROWS_FALLBACK];
}

async function getCertifications(): Promise<Certification[]> {
  try {
    const items = await listCollectionItems<SustainabilityCertItem>(
      "SustainabilityCertification",
      20,
    );
    if (items.length > 0) {
      return [...items]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((item) => ({ name: item.name, body: item.body }));
    }
  } catch {
    // fall through to static data
  }
  return [...CERTIFICATIONS_FALLBACK];
}

async function getMaterials(): Promise<Material[]> {
  try {
    const items = await listCollectionItems<MaterialItem>(
      "SustainabilityMaterial",
      24,
    );
    if (items.length > 0) {
      return [...items]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((item) => ({
          title: item.title,
          description: item.description,
          imageAlt: item.imageAlt ?? item.title,
          imageUrl: item.imageUrl,
        }));
    }
  } catch {
    // fall through to static data
  }
  return [...MATERIALS_FALLBACK];
}

// ── Page ────────────────────────────────────────────────────────────

export default async function SustainabilityPage() {
  const [
    storyRows,
    certifications,
    materials,
    eyebrow,
    introHeading,
    introBody,
    storiesHeading,
    materialsHeading,
    materialsSubhead,
    carbonHeading,
    carbonBody,
    certsHeading,
    certsSubhead,
    tradeinHeading,
    tradeinSubhead,
    tradeinCtaLabel,
  ] = await Promise.all([
    getStoryRows(),
    getCertifications(),
    getMaterials(),
    getSiteContent("sustainability.eyebrow", SUSTAINABILITY_COPY_FALLBACKS.eyebrow),
    getSiteContent("sustainability.intro.heading", SUSTAINABILITY_COPY_FALLBACKS.introHeading),
    getSiteContent("sustainability.intro.body", SUSTAINABILITY_COPY_FALLBACKS.introBody),
    getSiteContent("sustainability.stories.heading", SUSTAINABILITY_COPY_FALLBACKS.storiesHeading),
    getSiteContent("sustainability.materials.heading", SUSTAINABILITY_COPY_FALLBACKS.materialsHeading),
    getSiteContent("sustainability.materials.subhead", SUSTAINABILITY_COPY_FALLBACKS.materialsSubhead),
    getSiteContent("sustainability.carbon.heading", SUSTAINABILITY_COPY_FALLBACKS.carbonHeading),
    getSiteContent("sustainability.carbon.body", SUSTAINABILITY_COPY_FALLBACKS.carbonBody),
    getSiteContent("sustainability.certs.heading", SUSTAINABILITY_COPY_FALLBACKS.certsHeading),
    getSiteContent("sustainability.certs.subhead", SUSTAINABILITY_COPY_FALLBACKS.certsSubhead),
    getSiteContent("sustainability.trade-in.heading", SUSTAINABILITY_COPY_FALLBACKS.tradeinHeading),
    getSiteContent("sustainability.trade-in.subhead", SUSTAINABILITY_COPY_FALLBACKS.tradeinSubhead),
    getSiteContent("sustainability.trade-in.cta-label", SUSTAINABILITY_COPY_FALLBACKS.tradeinCtaLabel),
  ]);

  const schema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Sustainability — Carolina Futons",
    description: introBody,
    url: "https://carolinafutons.com/sustainability",
    mainEntity: {
      "@type": "Organization",
      name: "Carolina Futons",
      foundingDate: "1991",
      areaServed: "US",
      hasCredential: certifications.map((c) => ({
        "@type": "EducationalOccupationalCredential",
        name: c.name,
      })),
    },
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <JsonLd schema={schema} id="sustainability-schema" />

      <header className="max-w-[65ch] space-y-3 font-source-sans">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
          {eyebrow}
        </p>
        <h1 className="font-playfair text-4xl font-semibold tracking-tight text-cf-ink sm:text-5xl">
          {introHeading}
        </h1>
        <p className="text-lg leading-relaxed text-cf-muted">{introBody}</p>
      </header>

      {/* Story rows */}
      <section
        aria-labelledby="story-rows-heading"
        className="mt-14 space-y-10"
        data-slot="sustainability-stories"
      >
        <h2
          id="story-rows-heading"
          className="font-playfair text-2xl font-semibold tracking-tight text-cf-ink"
        >
          {storiesHeading}
        </h2>
        <ul className="space-y-10">
          {storyRows.map((row) => (
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

      {/* Materials repeater */}
      <section
        aria-labelledby="materials-heading"
        className="mt-16 space-y-6"
        data-slot="materials-repeater"
      >
        <h2
          id="materials-heading"
          className="font-playfair text-2xl font-semibold tracking-tight text-cf-ink"
        >
          {materialsHeading}
        </h2>
        <p className="max-w-[65ch] text-cf-muted">{materialsSubhead}</p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {materials.map((mat) => (
            <li
              key={mat.title}
              className="overflow-hidden rounded-md border border-cf-divider bg-white/60 dark:bg-cf-cream dark:border-cf-ink/30"
            >
              {mat.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mat.imageUrl}
                  alt={mat.imageAlt}
                  className="aspect-[3/2] w-full object-cover"
                />
              ) : (
                <div
                  role="img"
                  aria-label={mat.imageAlt}
                  className="aspect-[3/2] w-full bg-cf-sand/60"
                />
              )}
              <div className="p-4">
                <p className="font-medium text-cf-ink">{mat.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-cf-muted">
                  {mat.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Carbon offset section */}
      <section
        aria-labelledby="carbon-offset-heading"
        className="mt-16 rounded-lg border border-cf-divider bg-cf-sand/40 p-8"
        data-slot="carbon-offset-section"
      >
        <h2
          id="carbon-offset-heading"
          className="font-playfair text-2xl font-semibold tracking-tight text-cf-ink"
        >
          {carbonHeading}
        </h2>
        <p className="mt-3 max-w-[65ch] text-cf-muted">{carbonBody}</p>
        <ul className="mt-6 space-y-3 text-sm text-cf-muted">
          <li className="flex gap-3">
            <span className="mt-0.5 text-cf-cta" aria-hidden="true">&#x2713;</span>
            <span>Manufacturing carbon footprint calculated per SKU</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 text-cf-cta" aria-hidden="true">&#x2713;</span>
            <span>Regional delivery routes optimized to minimize last-mile emissions</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 text-cf-cta" aria-hidden="true">&#x2713;</span>
            <span>Reforestation contribution bundled into every order at no charge to you</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 text-cf-cta" aria-hidden="true">&#x2713;</span>
            <span>Annual impact report published each spring</span>
          </li>
        </ul>
      </section>

      {/* Certifications */}
      <section
        aria-labelledby="certifications-heading"
        className="mt-16 space-y-6"
      >
        <h2
          id="certifications-heading"
          className="font-playfair text-2xl font-semibold tracking-tight text-cf-ink"
        >
          {certsHeading}
        </h2>
        <p className="max-w-[65ch] text-cf-muted">{certsSubhead}</p>
        <ul className="grid gap-4 sm:grid-cols-3">
          {certifications.map((cert) => (
            <li
              key={cert.name}
              className="rounded-md border border-cf-divider bg-white/60 dark:bg-cf-cream dark:border-cf-ink/30 p-4"
            >
              <p className="font-medium text-cf-ink">{cert.name}</p>
              <p className="mt-2 text-sm text-cf-muted">{cert.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Trade-in steps */}
      <section
        aria-labelledby="trade-in-heading"
        className="mt-16 space-y-6"
        data-slot="trade-in-steps"
      >
        <h2
          id="trade-in-heading"
          className="font-playfair text-2xl font-semibold tracking-tight text-cf-ink"
        >
          {tradeinHeading}
        </h2>
        <p className="max-w-[65ch] text-cf-muted">{tradeinSubhead}</p>
        <ol className="grid gap-6 sm:grid-cols-3">
          {TRADE_IN_STEPS.map((s) => (
            <li
              key={s.step}
              className="rounded-md border border-cf-divider bg-white/60 dark:bg-cf-cream dark:border-cf-ink/30 p-6"
            >
              <span
                className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-cf-cta/10 text-sm font-semibold text-cf-cta"
                aria-hidden="true"
              >
                {s.step}
              </span>
              <p className="font-medium text-cf-ink">{s.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-cf-muted">
                {s.description}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-2">
          <Link
            href="/contact"
            className="inline-flex h-11 items-center justify-center rounded-md bg-cf-cta px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {tradeinCtaLabel}
          </Link>
        </p>
      </section>
    </main>
  );
}
