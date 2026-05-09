// cfw-7s6 (cf-3qt.8.D follow-up): pin schema.org AggregateRating + Review
// JSON-LD shape and the </script> escape that prevents review-body XSS.

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { ReviewsJsonLd } from "@/components/seo/ReviewsJsonLd";
import type { Review } from "@/lib/discovery/reviews";

const sampleReviews: ReadonlyArray<Review> = [
  {
    id: "r-001",
    author: "Marcia R.",
    category: "frames",
    rating: 5,
    title: "Solid hardwood — built to last",
    body: "Six years and still rock solid.",
    date: "2024-08-10",
    productName: "Kingston Solid Oak Frame",
  },
  {
    id: "r-002",
    author: "Tom K.",
    category: "mattresses",
    rating: 4,
    title: "Comfortable but firm",
    body: "Took a week to break in. Worth it.",
    date: "2024-09-15",
    productName: "Hand-built Mattress",
  },
];

function readJsonLd(): Record<string, unknown> {
  const script = document.querySelector(
    "script[type='application/ld+json']",
  ) as HTMLScriptElement | null;
  if (!script) throw new Error("expected JSON-LD script tag");
  return JSON.parse(script.textContent ?? "") as Record<string, unknown>;
}

describe("ReviewsJsonLd (cfw-7s6)", () => {
  it("renders nothing when there are zero reviews", () => {
    const { container } = render(
      <ReviewsJsonLd averageRating={0} totalReviewCount={0} reviews={[]} />,
    );
    expect(container.querySelector("script")).toBeNull();
  });

  it("renders nothing when totalReviewCount is zero (defensive — never claim ratings we can't back)", () => {
    const { container } = render(
      <ReviewsJsonLd
        averageRating={5}
        totalReviewCount={0}
        reviews={sampleReviews}
      />,
    );
    expect(container.querySelector("script")).toBeNull();
  });

  it("emits a script[type='application/ld+json'] when reviews exist", () => {
    render(
      <ReviewsJsonLd
        averageRating={4.5}
        totalReviewCount={2}
        reviews={sampleReviews}
      />,
    );
    const script = document.querySelector(
      "script[type='application/ld+json'][data-testid='reviews-json-ld']",
    );
    expect(script).not.toBeNull();
  });

  it("emits the canonical schema.org Organization wrapper with @id pinning", () => {
    render(
      <ReviewsJsonLd
        averageRating={4.5}
        totalReviewCount={2}
        reviews={sampleReviews}
      />,
    );
    const ld = readJsonLd();
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Organization");
    expect(ld["@id"]).toBe("https://carolinafutons.com#organization");
    expect(ld.name).toBe("Carolina Futons");
  });

  it("emits AggregateRating with one-decimal ratingValue + reviewCount + best/worst", () => {
    render(
      <ReviewsJsonLd
        averageRating={4.5}
        totalReviewCount={42}
        reviews={sampleReviews}
      />,
    );
    const ld = readJsonLd() as { aggregateRating: Record<string, unknown> };
    expect(ld.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: "4.5",
      reviewCount: 42,
      bestRating: 5,
      worstRating: 1,
    });
  });

  it("formats integer averages with the one-decimal canonical form", () => {
    render(
      <ReviewsJsonLd
        averageRating={5}
        totalReviewCount={3}
        reviews={sampleReviews}
      />,
    );
    const ld = readJsonLd() as { aggregateRating: { ratingValue: unknown } };
    expect(ld.aggregateRating.ratingValue).toBe("5.0");
  });

  it("emits one Review entry per input review with full schema.org fields", () => {
    render(
      <ReviewsJsonLd
        averageRating={4.5}
        totalReviewCount={2}
        reviews={sampleReviews}
      />,
    );
    const ld = readJsonLd() as { review: Array<Record<string, unknown>> };
    expect(ld.review).toHaveLength(2);
    expect(ld.review[0]).toEqual({
      "@type": "Review",
      author: { "@type": "Person", name: "Marcia R." },
      datePublished: "2024-08-10",
      reviewRating: {
        "@type": "Rating",
        ratingValue: 5,
        bestRating: 5,
        worstRating: 1,
      },
      name: "Solid hardwood — built to last",
      reviewBody: "Six years and still rock solid.",
    });
  });

  it("escapes </script> sequences in review body so a malicious payload can't break out", () => {
    const exploitReview: Review = {
      id: "evil",
      author: "Imposter",
      category: "frames",
      rating: 5,
      title: "Great",
      body: "</script><script>alert('xss')</script>",
      date: "2024-01-01",
      productName: "Kingston",
    };
    render(
      <ReviewsJsonLd
        averageRating={5}
        totalReviewCount={1}
        reviews={[exploitReview]}
      />,
    );
    const script = document.querySelector(
      "script[type='application/ld+json']",
    ) as HTMLScriptElement;
    const raw = script.innerHTML;
    // The literal string </script> must NOT survive in the rendered HTML —
    // it has to be <-escaped to keep the surrounding script tag intact.
    expect(raw).not.toMatch(/<\/script>/i);
    // Only `<` needs escaping — `>` alone never terminates a script tag.
    // The escape leaves `>` intact, so the JSON renders as `</script>`.
    expect(raw).toContain("\\u003c/script>");
    // And the JSON parses back cleanly to the original body (escaping is
    // transparent to JSON.parse).
    const parsed = JSON.parse(script.textContent ?? "") as {
      review: Array<{ reviewBody: string }>;
    };
    expect(parsed.review[0].reviewBody).toContain("</script>");
  });
});
