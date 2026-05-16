import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { HeroReveal } from "@/components/motion/HeroReveal";
import { listGuides } from "@/lib/discovery/guides";
import { ReadingScene } from "@/components/mascot/ReadingScene";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { twitterFromOpenGraph } from "@/lib/seo/twitter-from-og";
import { buildBreadcrumbSchema, resolveSiteUrl } from "@/lib/seo/json-ld";
import { JsonLd } from "@/components/seo/JsonLd";

const CARD_STAGGER_SECONDS = 0.08;

const GUIDES_TITLE = "Buying Guides — Carolina Futons";
const GUIDES_DESCRIPTION =
  "Plain-English guides to picking a futon mattress, comparing platform beds, sizing a Murphy bed, and getting the most out of a small room.";

const GUIDES_OPEN_GRAPH = {
  title: GUIDES_TITLE,
  description: GUIDES_DESCRIPTION,
  url: "/guides",
  type: "website" as const,
  images: [DEFAULT_OG_IMAGE],
};

export const metadata: Metadata = {
  title: GUIDES_TITLE,
  description: GUIDES_DESCRIPTION,
  alternates: { canonical: "/guides" },
  openGraph: GUIDES_OPEN_GRAPH,
  twitter: twitterFromOpenGraph(GUIDES_OPEN_GRAPH),
};

export default async function GuidesIndexPage() {
  const guides = await listGuides();

  // cf-nm6p: BreadcrumbList JSON-LD so Google can render the "Home >
  // Guides" trail in SERP results. Absolute URLs are required by the
  // rich-result spec — relative paths silently fail eligibility.
  const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: `${siteUrl}/` },
    { name: "Guides", url: `${siteUrl}/guides` },
  ]);

  return (
    <main className="w-full">
      <JsonLd id="jsonld-breadcrumb" schema={breadcrumbSchema} />
      <ReadingScene className="max-h-64" />
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-12 font-source-sans text-cf-ink sm:px-6 sm:py-16">
        <HeroReveal>
          <header className="mx-auto max-w-[65ch] space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
              Buying guides
            </p>
            <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
              Figure out what you actually need
            </h1>
            <p className="text-lg leading-relaxed text-cf-muted">
              35 years of answering the same questions at the showroom, written
              down so you can read them in your own time.
            </p>
          </header>
        </HeroReveal>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide, index) => (
            <li key={guide.slug}>
              <HeroReveal delay={index * CARD_STAGGER_SECONDS}>
                <Link
                  href={`/guides/${guide.slug}`}
                  className="group flex h-full flex-col gap-3 rounded-lg border border-cf-ink/10 bg-white dark:bg-cf-cream dark:border-cf-ink/30 p-6 transition hover:border-cf-cta/40 hover:shadow-sm"
                >
                  <div
                    aria-hidden="true"
                    className="relative h-32 overflow-hidden rounded-md bg-gradient-to-br from-cf-cta/15 via-cf-cta/5 to-transparent"
                  >
                    {guide.coverImageUrl && (
                      <Image
                        src={guide.coverImageUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <h2 className="font-playfair text-xl font-semibold tracking-tight group-hover:text-cf-cta">
                    {guide.title}
                  </h2>
                  <p className="flex-1 text-sm leading-relaxed text-cf-muted">
                    {guide.hook}
                  </p>
                  <p className="text-xs uppercase tracking-[0.15em] text-cf-muted">
                    {guide.readingTimeMin} min read
                  </p>
                </Link>
              </HeroReveal>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
