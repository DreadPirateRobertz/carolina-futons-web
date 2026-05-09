import type { Review } from "@/lib/discovery/reviews";

// cfw-7s6 (cf-3qt.8.D follow-up): schema.org AggregateRating + Review JSON-LD
// for /reviews. Google's review-rich-snippets eligibility requires both the
// aggregate (so the SERP shows stars) AND a sample of individual Review
// entities under itemReviewed (so the rating is attributable to a real
// purchasable thing — the Organization in our case, since reviews span
// the whole shop, not a single SKU).
//
// We render this only when there are reviews loaded. Emitting an empty
// AggregateRating or a stub itemReviewed without supporting Review[] is
// worse than rendering nothing — Google may flag it as deceptive markup.

const ORG_NAME = "Carolina Futons";
// Used as the `itemReviewed.@id` so the rating attaches to a stable URL
// even if the org canonical home changes; the @id matches the homepage
// where the full Organization markup lives.
const ORG_ID = "https://carolinafutons.com#organization";

export type ReviewsJsonLdProps = {
  averageRating: number;
  totalReviewCount: number;
  reviews: ReadonlyArray<Review>;
};

type AggregateRatingLD = {
  "@type": "AggregateRating";
  ratingValue: string;
  reviewCount: number;
  bestRating: 5;
  worstRating: 1;
};

type ReviewLD = {
  "@type": "Review";
  author: { "@type": "Person"; name: string };
  datePublished: string;
  reviewRating: {
    "@type": "Rating";
    ratingValue: 1 | 2 | 3 | 4 | 5;
    bestRating: 5;
    worstRating: 1;
  };
  name: string;
  reviewBody: string;
};

type ReviewsLDPayload = {
  "@context": "https://schema.org";
  "@type": "Organization";
  "@id": string;
  name: string;
  aggregateRating: AggregateRatingLD;
  review: ReadonlyArray<ReviewLD>;
};

function buildPayload(props: ReviewsJsonLdProps): ReviewsLDPayload {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: ORG_NAME,
    aggregateRating: {
      "@type": "AggregateRating",
      // schema.org canonical form is a string with one decimal — Google
      // accepts numeric too but the string form survives JSON.stringify
      // round-trips without locale surprises.
      ratingValue: props.averageRating.toFixed(1),
      reviewCount: props.totalReviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    review: props.reviews.map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      datePublished: r.date,
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      name: r.title,
      reviewBody: r.body,
    })),
  };
}

// Escape `</script>` sequences inside the JSON so a review body containing
// the literal text `</script>` cannot terminate the surrounding script tag.
// `<` is the only character with that effect (browsers don't terminate on
// `>` alone), so the minimal-impact escape is replacing `<` with `<`.
// JSON.parse round-trips this back to `<` — the markup stays valid JSON-LD.
function escapeForScriptTag(json: string): string {
  return json.replace(/</g, "\\u003c");
}

export function ReviewsJsonLd(props: ReviewsJsonLdProps) {
  // Don't emit markup we can't back up — empty review[] would still render a
  // schema.org block that Google could flag as deceptive.
  if (props.reviews.length === 0 || props.totalReviewCount <= 0) {
    return null;
  }

  const payload = buildPayload(props);
  const json = escapeForScriptTag(JSON.stringify(payload));

  return (
    <script
      type="application/ld+json"
      // Fixed payload + escaped < — no user-controlled HTML reaches the DOM.
      dangerouslySetInnerHTML={{ __html: json }}
      data-testid="reviews-json-ld"
    />
  );
}
