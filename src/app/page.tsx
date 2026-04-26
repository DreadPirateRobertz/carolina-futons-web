import type { Metadata } from "next";

import {
  FilterFirst,
  type ThemeDCategory,
} from "@/components/theme-d/FilterFirst";
import { MascotFooterDivider } from "@/components/mascot/MascotFooterDivider";
import { EasterEggBear } from "@/components/mascot/EasterEggBear";
import { StatsStrip } from "@/components/site/StatsStrip";
import { TestimonialsStrip } from "@/components/site/TestimonialsStrip";
import { TrustBar } from "@/components/site/TrustBar";
import { EmailCapturePopup } from "@/components/site/EmailCapturePopup";
import {
  getCollectionBySlug,
  listProductsByCollectionId,
} from "@/lib/wix/products";

export const metadata: Metadata = {
  title: "Carolina Futons — Hardwood Frames & Mattresses | Hendersonville, NC",
  description:
    "Family-owned since 1991. Solid hardwood futon frames, natural mattresses, Murphy beds, and platform beds. Visit our Hendersonville, NC showroom or shop online.",
};

export const dynamic = "force-dynamic";

const FONTSHARE_URL =
  "https://api.fontshare.com/v2/css?f[]=clash-display@700&f[]=satoshi@400,500&display=swap";

const FILTER_CATEGORIES = [
  { slug: "futon-frames", collectionSlug: "futon-frames", label: "Futon Frames" },
  { slug: "murphy-cabinet-beds", collectionSlug: "murphy-cabinet-beds", label: "Murphy Beds" },
  { slug: "platform-beds", collectionSlug: "platform-beds", label: "Platform Beds" },
  { slug: "mattresses", collectionSlug: "mattresses", label: "Mattresses" },
] as const;

export default async function HomePage() {
  const categories = await Promise.all(
    FILTER_CATEGORIES.map(async (cat): Promise<ThemeDCategory> => {
      const collection = await getCollectionBySlug(cat.collectionSlug);
      const products = collection?._id
        ? await listProductsByCollectionId(collection._id, 24)
        : [];
      return { slug: cat.slug, label: cat.label, products };
    }),
  );

  return (
    <>
      <EmailCapturePopup />

      {/* Fontshare font injection — hoisted to <head> by React's link promotion */}
      <link rel="preconnect" href="https://api.fontshare.com" />
      <link rel="stylesheet" href={FONTSHARE_URL} />
      <style>{`
        .theme-d-shell,
        .theme-d-shell * {
          --font-theme-d-heading: 'Clash Display', sans-serif;
          --font-theme-d-body: 'Satoshi', sans-serif;
        }
        .theme-d-shell h1 {
          font-family: 'Clash Display', sans-serif;
          letter-spacing: -0.03em;
        }
      `}</style>

      <FilterFirst categories={categories} />

      {/* ── Trust bar ── */}
      <TrustBar />

      <StatsStrip />
      <TestimonialsStrip />

      {/* ── Value props ── */}
      <section className="border-t border-cf-divider bg-cf-sand/30">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-14 sm:grid-cols-3 sm:px-6 lg:px-8">
          {VALUE_PROPS.map((prop) => (
            <div
              key={prop.title}
              className="rounded-xl border border-cf-divider bg-white p-6"
            >
              <h3
                className="text-base font-semibold text-cf-espresso"
                style={{ fontFamily: "'Clash Display', sans-serif" }}
              >
                {prop.title}
              </h3>
              <p className="mt-2 text-sm text-cf-charcoal/80">{prop.body}</p>
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
