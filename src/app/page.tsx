// Theme C — SeaCat Luxury home variant.
//
// Dark slate base, gold/cream palette, premium Playfair Display serif,
// scroll-driven hero parallax, sticky chapter timeline (1991→2026).
//
// This replaces the default cream/navy homepage for design review. The
// original is preserved at src/app/page.default.tsx (not committed) and
// is recoverable via git. This variant lives only on feat/cf-theme-C-seacat-luxury.

import { SeacatHero } from "@/components/seacat/SeacatHero";
import { SeacatChapters } from "@/components/seacat/SeacatChapters";
import { SeacatCollection } from "@/components/seacat/SeacatCollection";
import { SeacatCta } from "@/components/seacat/SeacatCta";

export default function HomePage() {
  return (
    <>
      {/* 1. Full-bleed dark hero with scroll-driven parallax */}
      <SeacatHero />

      {/* 2. Sticky year-chapter timeline: 1991 → 2026 */}
      <SeacatChapters />

      {/* 3. Collection teaser: frames, Murphy beds, platform beds */}
      <SeacatCollection />

      {/* 4. Closing CTA — showroom visit invitation */}
      <SeacatCta />
    </>
  );
}
