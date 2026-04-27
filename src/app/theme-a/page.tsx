import type { Metadata } from "next";
import Link from "next/link";
import { BearHero } from "@/components/theme-a/BearHero";
import { MascotCategoryCard } from "@/components/theme-a/MascotCategoryCard";
import { MascotFooterDivider } from "@/components/theme-a/MascotFooterDivider";
import { V3_PAL as c } from "@/components/theme-a/MascotPalette";

export const metadata: Metadata = {
  title: "Theme A — Mascot World (preview)",
  robots: { index: false, follow: false },
};

const CATEGORIES = [
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

export default function ThemeAPage() {
  return (
    <main
      className="w-full"
      style={{ background: c.paperWarm, minHeight: "100vh", fontFamily: "var(--font-source-sans)" }}
    >
      {/* ── Hero ── */}
      <div className="w-full" style={{ height: "80vh", minHeight: 480, maxHeight: 800 }}>
        <BearHero />
      </div>

      {/* ── Headline ── */}
      <div
        className="mx-auto w-full max-w-5xl px-6 py-16 text-center"
        style={{ color: c.ink }}
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
          Family-owned since 1991, we make solid hardwood frames and American mattresses
          that last — no veneer, no shortcuts, no commission pressure.
        </p>
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
      </div>

      {/* ── Category cards ── */}
      <div className="mx-auto w-full max-w-5xl px-6 pb-24">
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
          {CATEGORIES.map((cat) => (
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

      {/* ── Find the bear Easter egg teaser ── */}
      <div
        className="mx-auto w-full max-w-5xl px-6 pb-24"
        style={{ color: c.ink }}
      >
        <div
          style={{
            borderRadius: 14,
            background: c.paper,
            padding: "32px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <p style={{ fontFamily: "var(--font-source-sans)", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", opacity: 0.6, marginBottom: 6 }}>
              Easter egg
            </p>
            <p style={{ fontFamily: "var(--font-playfair)", fontSize: "1.5rem", fontWeight: 700, marginBottom: 8 }}>
              Find the bear — 10% off
            </p>
            <p style={{ opacity: 0.75, fontSize: "0.9375rem" }}>
              There&apos;s a bear hiding somewhere on the site. Find him and claim your discount.
            </p>
          </div>
          <Link
            href="/shop"
            style={{
              background: c.ink,
              color: c.cream,
              borderRadius: 8,
              padding: "10px 22px",
              fontWeight: 600,
              fontSize: "0.9375rem",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Start exploring →
          </Link>
        </div>
      </div>

      {/* ── Footer divider ── */}
      <div className="w-full">
        <MascotFooterDivider />
      </div>
    </main>
  );
}
