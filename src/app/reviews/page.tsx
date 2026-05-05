import type { Metadata } from "next";

import { HeroReveal } from "@/components/motion/HeroReveal";
import { loadReviews } from "@/lib/discovery/google-reviews";
import { ReviewFilter } from "./ReviewFilter";
import { FallsScene } from "@/components/mascot/FallsScene";

export const metadata: Metadata = {
  title: "Customer Reviews — Carolina Futons",
  description:
    "Real reviews from Carolina Futons customers on our hardwood frames, hand-built mattresses, and Murphy beds.",
};

// TODO(cf-3qt.8.D): emit schema.org AggregateRating + Review JSON-LD via
// a dedicated component in the follow-up commit. Kept out of the skeleton
// push so the initial PR lands without the inline-script pattern.

export default async function ReviewsPage() {
  const loaded = await loadReviews();
  const reviews = loaded.reviews;
  const avg = loaded.averageRating ?? 0;
  const total = loaded.totalReviewCount ?? reviews.length;

  return (
    <main className="w-full">
      <FallsScene className="max-h-64" />
      <div className="mx-auto max-w-4xl space-y-12 px-4 py-12 font-source-sans text-cf-ink sm:px-6 sm:py-16">
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
