import Link from "next/link";

import {
  REVIEWS,
  type Review,
  type ReviewCategory,
} from "@/lib/discovery/reviews";
import { getReviewStats } from "@/lib/product/review-stats";

export type PdpReviewsProps = {
  productName: string;
  productSlug: string;
  // Cap the number of cards shown on the PDP. /reviews is the full archive.
  limit?: number;
};

const HEADING_ID = "pdp-reviews-heading";
const DEFAULT_LIMIT = 3;

export function PdpReviews({
  productName,
  productSlug,
  limit = DEFAULT_LIMIT,
}: PdpReviewsProps) {
  const stats = getReviewStats(productSlug);
  const matched = pickReviews(productName, productSlug, limit);

  return (
    <section
      aria-labelledby={HEADING_ID}
      className="mt-12 border-t border-cf-sand/60 pt-10"
      data-slot="pdp-reviews"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id={HEADING_ID}
          className="font-heading text-lg font-semibold text-cf-espresso"
        >
          Customer reviews
        </h2>
        <Link
          href="/reviews"
          className="text-sm text-cf-cta hover:underline"
        >
          See all reviews
        </Link>
      </div>

      {stats ? (
        <p
          className="mt-3 text-sm text-cf-espresso/80"
          data-slot="pdp-reviews-aggregate"
        >
          <span aria-label={`${stats.rating} out of 5 stars`}>
            <Stars rating={stats.rating} />
          </span>{" "}
          <span className="ml-1 font-medium">{stats.rating.toFixed(1)}</span>{" "}
          <span className="text-cf-espresso/60">
            ({stats.count} {stats.count === 1 ? "review" : "reviews"})
          </span>
        </p>
      ) : null}

      {matched.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {matched.map((review) => (
            <li key={review.id}>
              <ReviewCard review={review} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-cf-espresso/70">
          Be the first to share your story —{" "}
          <Link href="/reviews" className="text-cf-cta hover:underline">
            read what other customers say
          </Link>
          .
        </p>
      )}
    </section>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="space-y-2 rounded-lg border border-cf-sand/60 bg-white p-5">
      <div
        aria-label={`${review.rating} out of 5 stars`}
        className="flex gap-0.5"
      >
        <Stars rating={review.rating} />
      </div>
      <h3 className="font-heading text-base font-semibold text-cf-espresso">
        {review.title}
      </h3>
      <p className="text-sm leading-relaxed text-cf-espresso/80">
        {review.body}
      </p>
      <p className="text-xs uppercase tracking-[0.12em] text-cf-espresso/60">
        {review.author} · {formatDate(review.date)}
      </p>
    </article>
  );
}

function Stars({ rating }: { rating: number }) {
  // Rounded to nearest whole star for the inline glyph row. The numeric
  // aggregate (e.g. "4.8") carries the precise value alongside.
  const filled = Math.round(rating);
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={i < filled ? "text-cf-cta" : "text-cf-espresso/20"}
        >
          ★
        </span>
      ))}
    </>
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

// Slug-to-category mapping for fallback when no review names this product.
// Order matters: "murphy" must precede "bed" so a Murphy bed slug isn't
// caught as a frame.
function categoryForSlug(slug: string): ReviewCategory | null {
  const s = slug.toLowerCase();
  if (s.includes("murphy")) return "murphy-beds";
  if (s.includes("mattress")) return "mattresses";
  if (
    s.includes("frame") ||
    s.includes("futon") ||
    s.includes("daybed") ||
    s.includes("platform-bed") ||
    s.includes("bed-frame")
  ) {
    return "frames";
  }
  return null;
}

function pickReviews(
  productName: string,
  productSlug: string,
  limit: number,
): readonly Review[] {
  // 1. Reviews that name this product.
  const named = REVIEWS.filter(
    (r) => r.productName.toLowerCase() === productName.toLowerCase(),
  );
  if (named.length > 0) return named.slice(0, limit);

  // 2. Reviews in the same category (mapped from slug).
  const category = categoryForSlug(productSlug);
  if (category) {
    const inCategory = REVIEWS.filter((r) => r.category === category);
    if (inCategory.length > 0) return inCategory.slice(0, limit);
  }

  // 3. No fallback to all reviews — the empty state is more honest than
  // showing reviews of unrelated products.
  return [];
}
