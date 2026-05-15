import type { Metadata } from "next";

import { HeroReveal } from "@/components/motion/HeroReveal";
import { ReviewsJsonLd } from "@/components/seo/ReviewsJsonLd";
import { loadReviews } from "@/lib/discovery/google-reviews";
import { ReviewFilter } from "./ReviewFilter";
import { FallsScene } from "@/components/mascot/FallsScene";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { twitterFromOpenGraph } from "@/lib/seo/twitter-from-og";

const REVIEWS_TITLE = "Customer Reviews — Carolina Futons";
const REVIEWS_DESCRIPTION =
  "Real reviews from Carolina Futons customers on our hardwood frames, hand-built mattresses, and Murphy beds.";

const REVIEWS_OPEN_GRAPH = {
  title: REVIEWS_TITLE,
  description: REVIEWS_DESCRIPTION,
  url: "/reviews",
  type: "website" as const,
  images: [DEFAULT_OG_IMAGE],
};

export const metadata: Metadata = {
  title: REVIEWS_TITLE,
  description: REVIEWS_DESCRIPTION,
  alternates: { canonical: "/reviews" },
  openGraph: REVIEWS_OPEN_GRAPH,
  twitter: twitterFromOpenGraph(REVIEWS_OPEN_GRAPH),
};

export default async function ReviewsPage() {
  const loaded = await loadReviews();
  const reviews = loaded.reviews;
  const avg = loaded.averageRating ?? 0;
  const total = loaded.totalReviewCount ?? reviews.length;

  return (
    <main className="w-full">
      {loaded.ok && reviews.length > 0 ? (
        <ReviewsJsonLd
          averageRating={avg}
          totalReviewCount={total}
          reviews={reviews}
        />
      ) : null}
      <FallsScene className="max-h-64" />
      <div className="mx-auto max-w-4xl space-y-12 px-4 py-12 font-source-sans text-cf-ink dark:text-cf-cream sm:px-6 sm:py-16">
        <HeroReveal>
          <header className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
              Customer reviews
            </p>
            <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
              What customers say
            </h1>
            {loaded.ok && reviews.length > 0 ? (
              <p className="text-lg leading-relaxed text-cf-muted">
                {avg.toFixed(1)} out of 5 across {total} recent reviews. We
                publish the full text, including the mixed ones — the showroom
                team reads every single one.
              </p>
            ) : (
              <p className="text-lg leading-relaxed text-cf-muted">
                {loaded.ok
                  ? "We don't have any reviews to show right now. The showroom team reads every customer comment as it comes in — please check back soon."
                  : "We couldn't load reviews right now. Please refresh, or come back in a few minutes."}
              </p>
            )}
          </header>
        </HeroReveal>

        {loaded.ok && reviews.length > 0 ? <ReviewFilter reviews={reviews} /> : null}
      </div>
    </main>
  );
}
