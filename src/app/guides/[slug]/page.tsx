import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HeroReveal } from "@/components/motion/HeroReveal";
import { listGuides } from "@/lib/discovery/guides";
import { GuideReadingProgress } from "./ReadingProgress";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { twitterFromOpenGraph } from "@/lib/seo/twitter-from-og";
import { buildBreadcrumbSchema, resolveSiteUrl } from "@/lib/seo/json-ld";
import { JsonLd } from "@/components/seo/JsonLd";

type RouteParams = { slug: string };

export async function generateStaticParams(): Promise<RouteParams[]> {
  const guides = await listGuides();
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = (await listGuides()).find((g) => g.slug === slug);
  if (!guide) {
    return { title: "Guide not found — Carolina Futons" };
  }
  const title = `${guide.title} — Carolina Futons`;
  // cf-e55k: per-page openGraph + twitter so guide pages surface the
  // guide's own title/hook on Facebook/Slack/iMessage/X unfurls instead
  // of falling back to the layout-level siteName/default OG image.
  const og = {
    title,
    description: guide.hook,
    url: `/guides/${guide.slug}`,
    type: "article" as const,
    images: [guide.coverImageUrl ? { url: guide.coverImageUrl } : DEFAULT_OG_IMAGE],
  };
  return {
    title,
    description: guide.hook,
    alternates: { canonical: `/guides/${slug}` },
    openGraph: og,
    twitter: twitterFromOpenGraph(og),
  };
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const allGuides = await listGuides();
  const guide = allGuides.find((g) => g.slug === slug);
  if (!guide) {
    notFound();
  }
  const related = allGuides.filter((g) => g.slug !== slug).slice(0, 3);

  // cf-nm6p: BreadcrumbList JSON-LD so Google can render the
  // "Home > Guides > {article title}" trail in SERP results. Absolute
  // URLs are required by the rich-result spec.
  const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: `${siteUrl}/` },
    { name: "Guides", url: `${siteUrl}/guides` },
    { name: guide.title, url: `${siteUrl}/guides/${guide.slug}` },
  ]);

  return (
    <>
      <JsonLd id="jsonld-breadcrumb" schema={breadcrumbSchema} />
      <GuideReadingProgress />
      <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
        <article className="mx-auto max-w-[65ch] space-y-10 font-source-sans text-cf-ink dark:text-cf-cream">
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

          {guide.sections && guide.sections.length > 0 ? (
            <div className="space-y-8">
              {guide.sections.map((section) => (
                <section key={section.heading} className="space-y-4">
                  <h2 className="font-playfair text-2xl font-semibold tracking-tight">
                    {section.heading}
                  </h2>
                  <p className="leading-relaxed">{section.body}</p>
                </section>
              ))}
            </div>
          ) : (
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
          )}

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
