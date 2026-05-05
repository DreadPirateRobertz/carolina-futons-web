import type { Metadata } from "next";

import { BundleConfigurator } from "@/components/bundle/BundleConfigurator";
import {
  getCollectionBySlug,
  listProductsByCollectionId,
} from "@/lib/wix/products";

export const metadata: Metadata = {
  title: "Bundle Builder — Frame + Mattress | Carolina Futons",
  description:
    "Build your perfect futon bundle. Choose a solid hardwood frame and a natural mattress — bundled together and save up to 10%.",
};

export const dynamic = "force-dynamic";

async function loadCollection(slug: string) {
  try {
    const collection = await getCollectionBySlug(slug);
    if (!collection?._id) return [];
    return await listProductsByCollectionId(collection._id, 24);
  } catch {
    return [];
  }
}

export default async function BundlePage() {
  const [frames, mattresses] = await Promise.all([
    loadCollection("futon-frames"),
    loadCollection("mattresses"),
  ]);

  return (
    <main
      data-slot="bundle-page"
      className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
    >
      <header className="mb-10 space-y-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-cf-navy sm:text-4xl">
          Build your bundle
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-cf-charcoal/80">
          Pair a solid hardwood frame with a natural mattress and save up to 10%
          off the combined price. Everything ships together.
        </p>
      </header>

      <BundleConfigurator frames={frames} mattresses={mattresses} />
    </main>
  );
}
