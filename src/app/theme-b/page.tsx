import type { Metadata } from "next";

import { listProducts } from "@/lib/wix/products";
import { MarugameHero } from "@/components/theme-b/MarugameHero";
import { MarugameGrid } from "@/components/theme-b/MarugameGrid";

// Theme B preview route. Not linked from the main site — access directly
// at /theme-b for design review. All purchases and navigation still work
// because this shares the main app layout (header, footer, PageTransition).

export const metadata: Metadata = {
  title: "Theme B — Marugame Grid Preview",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 8;

export default async function ThemeBPage() {
  const initial = await listProducts(PAGE_SIZE);
  return (
    <>
      <MarugameHero />
      <MarugameGrid initial={initial} pageSize={PAGE_SIZE} />
    </>
  );
}
