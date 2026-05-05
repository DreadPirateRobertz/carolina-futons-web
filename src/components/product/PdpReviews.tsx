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

// Select reviews to spotlight on the PDP. Fallback chain favors honest
// specificity: exact productName -> inferred category -> []. The previous
// "top-rated overall" tier was removed because it surfaced reviews from
// unrelated categories captioned as the current product's reviews.
export function pickPdpReviews(productName: string): readonly Review[] {
  const exact = REVIEWS.filter((r) => r.productName === productName);
  if (exact.length > 0) return exact.slice(0, MAX_CARDS);

  const category = inferReviewCategory(productName);
  if (category) {
    const byCategory = REVIEWS.filter((r) => r.category === category);
    if (byCategory.length > 0) return byCategory.slice(0, MAX_CARDS);
  }

  return [];
}

// Map a free-form Wix product name to a ReviewCategory. Keyword matching is
// intentionally simple — an explicit category prop would be cleaner if the
// product schema ever carries one.
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

  // Aggregate is suppressed when reviews is empty so we never show a count
  // ("42 reviews") with zero cards beneath it.
  if (reviews.length === 0) {
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
        <SharePhotoCta productSlug={productSlug} />
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

      <ul className="mt-6 space-y-6">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </ul>

      <p className="mt-6 text-sm">
        <Link href="/reviews" className="underline hover:no-underline">
          See all customer reviews
        </Link>
      </p>

      <SharePhotoCta productSlug={productSlug} />
    </section>
  );
}

// Hooks the PDP to the community gallery: prefills the productSlug field via
// query string so the submitted photo is linked back to this product page.
// Copy stays aligned with the gallery page's primary action and the submit
// page heading ("Share your photo") so the journey reads as one flow.
function SharePhotoCta({ productSlug }: { productSlug: string }) {
  const href = productSlug
    ? `/community-gallery/submit?productSlug=${encodeURIComponent(productSlug)}`
    : "/community-gallery/submit";
  return (
    <p className="mt-6 text-sm text-cf-espresso/80" data-slot="pdp-share-photo-cta">
      Got this in your home?{" "}
      <Link
        href={href}
        className="font-medium text-cf-espresso underline hover:no-underline"
      >
        Share your photo
      </Link>{" "}
      and we may feature it in our community gallery.
    </p>
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
    <li className="rounded-md border border-cf-divider bg-white/60 p-4 dark:bg-cf-cream/60">
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
        {review.author} ·{" "}
        <time dateTime={review.date}>{formatDate(review.date)}</time>
      </p>
    </li>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(`[pdp-reviews] invalid review date: "${iso}"`);
    }
    return iso;
  }
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
