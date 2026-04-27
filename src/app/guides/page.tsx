import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { HeroReveal } from "@/components/motion/HeroReveal";
import { listGuides } from "@/lib/discovery/guides";
import { BotanicalGuides } from "@/components/illustrations/BotanicalGuides";

const CARD_STAGGER_SECONDS = 0.08;

export const metadata: Metadata = {
  title: "Buying Guides — Carolina Futons",
  description:
    "Plain-English guides to picking a futon mattress, comparing platform beds, sizing a Murphy bed, and getting the most out of a small room.",
};

export default async function GuidesIndexPage() {
  const guides = await listGuides();

  return (
    <main className="w-full">
      {/* cf-pgec: v2 Botanical open-book header illustration */}
      <BotanicalGuides className="max-h-64" />
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
              35 years of answering the same questions at the showroom,
              written down so you can read them in your own time.
            </p>
          </header>
        </HeroReveal>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide, index) => (
            <li key={guide.slug}>
              <HeroReveal delay={index * CARD_STAGGER_SECONDS}>
                <Link
                  href={`/guides/${guide.slug}`}
                  className="group flex h-full flex-col gap-3 rounded-lg border border-cf-ink/10 bg-white p-6 transition hover:border-cf-cta/40 hover:shadow-sm"
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
