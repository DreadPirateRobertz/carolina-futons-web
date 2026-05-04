import type { Metadata } from "next";

import { HeroReveal } from "@/components/motion/HeroReveal";
import { REVIEWS, averageRating } from "@/lib/discovery/reviews";
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

export default function ReviewsPage() {
  const avg = averageRating(REVIEWS);

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
            <p className="text-lg leading-relaxed text-cf-muted">
              {avg.toFixed(1)} out of 5 across {REVIEWS.length} recent reviews.
              We publish the full text, including the mixed ones — the
              showroom team reads every single one.
            </p>
          </header>
        </HeroReveal>

        <ReviewFilter />
      </div>
    </main>
  );
}
