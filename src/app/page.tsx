import type { Metadata } from "next";

import { listProducts } from "@/lib/wix/products";
import { MarugameHero } from "@/components/theme-b/MarugameHero";
import { MarugameGrid } from "@/components/theme-b/MarugameGrid";
import { MrPopsMarquee } from "@/components/site/MrPopsMarquee";

export const metadata: Metadata = {
  title: "Carolina Futons — Hardwood Frames & Mattresses | Hendersonville, NC",
  description:
    "Family-owned since 1991. Solid hardwood futon frames, natural mattresses, Murphy beds, and platform beds. Visit our Hendersonville, NC showroom or shop online.",
};

const PAGE_SIZE = 8;

export default async function HomePage() {
  const initial = await listProducts(PAGE_SIZE);
  return (
    <>
      <MarugameHero />
      <MrPopsMarquee />
      <MarugameGrid initial={initial} pageSize={PAGE_SIZE} />
    </>
  );
}
