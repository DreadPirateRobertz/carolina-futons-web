import type { Metadata } from "next";

import { listProducts } from "@/lib/wix/products";
import { MarugameHero } from "@/components/theme-b/MarugameHero";
import { MarugameGrid } from "@/components/theme-b/MarugameGrid";

// Theme B fallback preview — kept for design comparison after promotion to /.
// The canonical version lives at /app/page.tsx. Access /theme-b directly.

export const metadata: Metadata = {
  title: "Theme B — Marugame Grid (preview)",
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
