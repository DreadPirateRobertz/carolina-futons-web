import Link from "next/link";
import type { Metadata } from "next";
import { MascotWorldHero } from "@/components/mascot/MascotWorldHero";
import { MascotCategoryCard } from "@/components/mascot/MascotCategoryCard";
import { MascotFooterDivider } from "@/components/mascot/MascotFooterDivider";
import { EasterEggBear } from "@/components/mascot/EasterEggBear";
import { FeaturedProducts } from "@/components/site/FeaturedProducts";
import { StatsStrip } from "@/components/site/StatsStrip";
import { TestimonialsStrip } from "@/components/site/TestimonialsStrip";
import { TrustBar } from "@/components/site/TrustBar";
import { EmailCapturePopup } from "@/components/site/EmailCapturePopup";
import { listFeaturedProducts } from "@/lib/shop/featured";
import { V3_PAL as c } from "@/components/mascot/MascotPalette";

export const metadata: Metadata = {
  title: "Carolina Futons — Hardwood Frames & Mattresses | Hendersonville, NC",
  description:
    "Family-owned since 1991. Solid hardwood futon frames, natural mattresses, Murphy beds, and platform beds. Visit our Hendersonville, NC showroom or shop online.",
};

const MASCOT_CATEGORIES = [
  {
    slug: "futon-frames",
    title: "Futon Frames",
    subtitle: "Solid hardwood",
    animal: "bear" as const,
    accent: "#F5C97A",
  },
  {
    slug: "murphy-cabinet-beds",
    title: "Murphy Beds",
    subtitle: "Space-saving",
    animal: "deer" as const,
    accent: "#8BB5C9",
  },
  {
    slug: "platform-beds",
    title: "Platform Beds",
    subtitle: "Low & modern",
    animal: "fox" as const,
    accent: "#E8845C",
  },
  {
    slug: "mattresses",
    title: "Mattresses",
    subtitle: "Made in USA",
    animal: "owl" as const,
    accent: "#6B8A4A",
  },
];

export default async function HomePage() {
  const featured = await listFeaturedProducts();

  return (
    <>
      <EmailCapturePopup />

      {/* ── Mascot World hero — bear eyes track cursor ── */}
      <div className="w-full" style={{ height: "80vh", minHeight: 500, maxHeight: 900 }}>
        <MascotWorldHero />
      </div>

      {/* ── Headline ── */}
      <div
        className="mx-auto w-full max-w-5xl px-6 py-16 text-center"
        style={{ background: c.paperWarm, color: c.ink }}
      >
        <p
          style={{
            fontFamily: "var(--font-source-sans)",
            fontSize: 11,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            opacity: 0.6,
            marginBottom: 12,
          }}
        >
          Handmade in the Blue Ridge
        </p>
        <h1
          style={{
            fontFamily: "var(--font-playfair)",
            fontSize: "clamp(2.4rem, 5vw, 4rem)",
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 20,
          }}
        >
          Furniture that earns its place.
        </h1>
        <p
          style={{
            fontSize: "1.125rem",
            lineHeight: 1.7,
            maxWidth: 560,
            margin: "0 auto 32px",
            opacity: 0.8,
          }}
        >
          Family-owned since 1991. Solid hardwood frames, American mattresses
          — no veneer, no shortcuts, no commission pressure.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/shop"
            style={{
              display: "inline-block",
              background: c.ink,
              color: c.cream,
              borderRadius: 8,
              padding: "12px 28px",
              fontWeight: 600,
              fontSize: "0.9375rem",
              textDecoration: "none",
              letterSpacing: ".03em",
            }}
          >
            Browse all furniture
          </Link>
          <Link
            href="/design-a-room"
            style={{
              display: "inline-block",
              background: "transparent",
              color: c.ink,
              border: `1.5px solid ${c.ink}`,
              borderRadius: 8,
              padding: "12px 28px",
              fontWeight: 600,
              fontSize: "0.9375rem",
              textDecoration: "none",
              letterSpacing: ".03em",
              opacity: 0.75,
            }}
          >
            Design a room
          </Link>
        </div>
      </div>

      {/* ── Trust bar ── */}
      <TrustBar />

      {/* ── Category cards with hover-reveal animals ── */}
      <div style={{ background: c.paperWarm }}>
        <div className="mx-auto w-full max-w-5xl px-6 pb-24 pt-10">
          <h2
            style={{
              fontFamily: "var(--font-playfair)",
              fontSize: "1.75rem",
              fontWeight: 700,
              color: c.ink,
              marginBottom: 24,
            }}
          >
            What we make
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 20,
            }}
          >
            {MASCOT_CATEGORIES.map((cat) => (
              <MascotCategoryCard
                key={cat.slug}
                title={cat.title}
                subtitle={cat.subtitle}
                animal={cat.animal}
                accent={cat.accent}
                href={`/shop/${cat.slug}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Featured products ── */}
      <FeaturedProducts products={featured} />

      <StatsStrip />

      <TestimonialsStrip />

      {/* ── Value props ── */}
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

      {/* ── Sleeping bear footer divider ── */}
      <div className="w-full">
        <MascotFooterDivider />
      </div>

      {/* ── Hidden Easter egg bear ── */}
      <div
        style={{
          position: "fixed",
          bottom: 80,
          right: 16,
          zIndex: 40,
          opacity: 0.55,
        }}
        title="psst..."
      >
        <EasterEggBear />
      </div>
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
