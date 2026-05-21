import type { Metadata } from "next";

import { listSwatchesAction } from "@/app/actions/swatch-request";
import { SwatchRequestForm } from "@/components/swatch-request/SwatchRequestForm";
import { getSiteContent } from "@/lib/cms/site-content";

export const metadata: Metadata = {
  title: "Request Fabric Swatches — Carolina Futons",
  description:
    "Order free fabric swatches from Carolina Futons and see our colors and textures in your home before you buy. Ships free to any US address.",
};

const SWATCH_COPY_FALLBACKS = {
  eyebrow: "Free samples",
  heading: "Request fabric swatches.",
  introBody:
    "Not sure which fabric is right for your space? We'll mail up to five physical swatches so you can feel the texture and see the color in your own lighting — completely free.",
} as const;

export default async function SwatchRequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const [params, eyebrow, heading, introBody] = await Promise.all([
    searchParams,
    getSiteContent("swatch.eyebrow", SWATCH_COPY_FALLBACKS.eyebrow),
    getSiteContent("swatch.heading", SWATCH_COPY_FALLBACKS.heading),
    getSiteContent("swatch.intro.body", SWATCH_COPY_FALLBACKS.introBody),
  ]);
  const productSlug = typeof params.product === "string" ? params.product : undefined;
  const { items: swatches, error: swatchLoadError } = await listSwatchesAction();

  return (
    <main className="w-full">
      <div className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
        <article className="mx-auto max-w-2xl space-y-10 font-source-sans text-cf-ink">
          <header className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
              {eyebrow}
            </p>
            <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
              {heading}
            </h1>
            <p className="text-lg leading-relaxed text-cf-muted">{introBody}</p>
          </header>

          {swatchLoadError ? (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              We couldn&apos;t load our fabric options right now. Please try
              again in a moment or{" "}
              <a href="/contact" className="underline">
                contact us
              </a>{" "}
              and we&apos;ll send swatches directly.
            </p>
          ) : (
            <SwatchRequestForm swatches={swatches} productSlug={productSlug} />
          )}
        </article>
      </div>
    </main>
  );
}
