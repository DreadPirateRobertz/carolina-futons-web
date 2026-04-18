import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HeroReveal } from "@/components/motion/HeroReveal";
import {
  GUIDES,
  getGuideBySlug,
  getRelatedGuides,
} from "@/lib/discovery/guides";
import { GuideReadingProgress } from "./ReadingProgress";

type RouteParams = { slug: string };

export function generateStaticParams(): RouteParams[] {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) {
    return { title: "Guide not found — Carolina Futons" };
  }
  return {
    title: `${guide.title} — Carolina Futons`,
    description: guide.hook,
  };
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) {
    notFound();
  }
  const related = getRelatedGuides(guide.slug);

  return (
    <>
      <GuideReadingProgress />
      <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
        <article className="mx-auto max-w-[65ch] space-y-10 font-source-sans text-cf-ink">
          <HeroReveal>
            <header className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
                Guide
              </p>
              <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
                {guide.title}
              </h1>
              <p className="text-sm text-cf-muted">
                {guide.readingTimeMin} min read
              </p>
            </header>
          </HeroReveal>

          <p className="text-lg leading-relaxed">{guide.hook}</p>

          <section className="space-y-4">
            <h2 className="font-playfair text-2xl font-semibold tracking-tight">
              Overview
            </h2>
            <p className="leading-relaxed">
              This guide walks through the questions we ask customers at the
              showroom and the tradeoffs that tend to matter most. Full
              long-form content is being edited by the team and will land in a
              follow-up pass.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-playfair text-2xl font-semibold tracking-tight">
              Still have questions?
            </h2>
            <p className="leading-relaxed">
              Call the Hendersonville showroom at{" "}
              <a
                href="tel:+18282529449"
                className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
              >
                (828) 252-9449
              </a>{" "}
              or{" "}
              <Link
                href="/design-a-room"
                className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
              >
                start a free consultation
              </Link>
              .
            </p>
          </section>

          {related.length > 0 ? (
            <aside className="space-y-4 border-t border-cf-ink/10 pt-10">
              <h2 className="font-playfair text-2xl font-semibold tracking-tight">
                Related guides
              </h2>
              <ul className="grid gap-4 sm:grid-cols-3">
                {related.map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/guides/${other.slug}`}
                      className="block space-y-1 rounded-md border border-cf-ink/10 p-4 transition hover:border-cf-cta/40"
                    >
                      <h3 className="font-playfair text-base font-semibold tracking-tight">
                        {other.title}
                      </h3>
                      <p className="text-xs text-cf-muted">
                        {other.readingTimeMin} min read
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
        </article>
      </main>
    </>
  );
}
