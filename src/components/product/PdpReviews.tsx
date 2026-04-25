import Link from "next/link";

import { getReviewStats, type ReviewStats } from "@/lib/product/review-stats";
import {
  REVIEWS,
  type Review,
  type ReviewCategory,
} from "@/lib/discovery/reviews";

export type PdpReviewsProps = {
  productSlug: string;
  productName: string;
};

const HEADING_ID = "pdp-reviews-heading";
const MAX_CARDS = 3;

// cf-3qt.6.F.8: select reviews to spotlight on the PDP. Static data only —
// the real review service lands later. Fallback chain favors specificity:
// exact productName -> inferred category -> top-rated overall. Always returns
// up to MAX_CARDS so the empty state below is reserved for the rare case
// where REVIEWS itself is empty (test seam, or future per-category lookup).
export function pickPdpReviews(productName: string): readonly Review[] {
  const exact = REVIEWS.filter((r) => r.productName === productName);
  if (exact.length > 0) return exact.slice(0, MAX_CARDS);

  const category = inferReviewCategory(productName);
  if (category) {
    const byCategory = REVIEWS.filter((r) => r.category === category);
    if (byCategory.length > 0) return byCategory.slice(0, MAX_CARDS);
  }

  // Top fallback: highest rating wins, then most recent.
  return [...REVIEWS]
    .sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.date.localeCompare(a.date);
    })
    .slice(0, MAX_CARDS);
}

// Map a free-form Wix product name to a ReviewCategory. Keyword matching is
// intentionally simple — phase 2 swaps this for an explicit category prop
// once the Wix product schema carries one.
function inferReviewCategory(productName: string): ReviewCategory | null {
  const name = productName.toLowerCase();
  if (name.includes("murphy")) return "murphy-beds";
  if (name.includes("mattress")) return "mattresses";
  if (name.includes("frame") || name.includes("daybed") || name.includes("futon")) {
    return "frames";
  }
  return null;
}

export function PdpReviews({ productSlug, productName }: PdpReviewsProps) {
  const stats = getReviewStats(productSlug);
  const reviews = pickPdpReviews(productName);

  if (!stats && reviews.length === 0) {
    return (
      <section
        aria-labelledby={HEADING_ID}
        className="mt-10 max-w-3xl border-t border-cf-sand/60 pt-10"
        data-slot="pdp-reviews"
      >
        <h2
          id={HEADING_ID}
          className="font-heading text-lg font-semibold text-cf-espresso"
        >
          Reviews
        </h2>
        <p className="mt-3 text-sm text-cf-espresso/70">
          No reviews yet.{" "}
          <Link href="/reviews" className="underline hover:no-underline">
            Read what other customers say
          </Link>
          .
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={HEADING_ID}
      className="mt-10 max-w-3xl border-t border-cf-sand/60 pt-10"
      data-slot="pdp-reviews"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id={HEADING_ID}
          className="font-heading text-lg font-semibold text-cf-espresso"
        >
          Reviews
        </h2>
        {stats ? <AggregateRating stats={stats} /> : null}
      </header>

      {reviews.length > 0 ? (
        <ul className="mt-6 space-y-6">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </ul>
      ) : null}

      <p className="mt-6 text-sm">
        <Link href="/reviews" className="underline hover:no-underline">
          See all customer reviews
        </Link>
      </p>
    </section>
  );
}

function AggregateRating({ stats }: { stats: ReviewStats }) {
  const rounded = stats.rating.toFixed(1);
  const label = `Average rating ${rounded} out of 5 from ${stats.count} reviews`;
  return (
    <p
      className="text-sm text-cf-espresso/80"
      aria-label={label}
      data-slot="pdp-reviews-aggregate"
    >
      <span className="font-medium text-cf-espresso">{rounded}</span>
      <span aria-hidden="true" className="mx-1 text-cf-espresso/50">
        ★
      </span>
      <span>({stats.count})</span>
    </p>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <li className="rounded-md border border-cf-divider bg-white/60 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium text-cf-espresso">{review.title}</p>
        <p
          className="text-sm text-cf-espresso/70"
          aria-label={`Rated ${review.rating} out of 5`}
        >
          <span aria-hidden="true">{"★".repeat(review.rating)}</span>
        </p>
      </div>
      <p className="mt-2 text-sm text-cf-espresso/80">{review.body}</p>
      <p className="mt-2 text-xs text-cf-espresso/60">
        {review.author} · {formatDate(review.date)}
      </p>
    </li>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
