import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { PdpReviews, pickPdpReviews } from "@/components/product/PdpReviews";
import { REVIEWS } from "@/lib/discovery/reviews";

// PdpReviews renders the aggregate rating + up to 3 review cards on the PDP.
// The card source uses a fallback chain (productName -> category -> top) so
// every product page has something to show even when the static REVIEWS list
// has no exact match. These tests pin that selection contract — the
// fallback order is the part most likely to silently regress.

describe("pickPdpReviews", () => {
  it("returns reviews matching the exact productName when present", () => {
    const picked = pickPdpReviews("Studio Murphy Bed");
    expect(picked.length).toBeGreaterThan(0);
    expect(picked.every((r) => r.productName === "Studio Murphy Bed")).toBe(true);
  });

  it("falls back to the inferred category when no productName matches", () => {
    const picked = pickPdpReviews("Brand-New Mattress 9000");
    expect(picked.length).toBeGreaterThan(0);
    expect(picked.every((r) => r.category === "mattresses")).toBe(true);
  });

  it("falls back to category for murphy products by keyword", () => {
    const picked = pickPdpReviews("Bespoke Murphy Cabinet");
    expect(picked.every((r) => r.category === "murphy-beds")).toBe(true);
  });

  it("falls back to top-rated reviews when no productName or category matches", () => {
    const picked = pickPdpReviews("Generic Throw Pillow");
    expect(picked.length).toBeLessThanOrEqual(3);
    // Top fallback orders by rating desc then date desc — first card should be
    // a 5-star review.
    expect(picked[0].rating).toBe(5);
  });

  it("returns at most 3 review cards", () => {
    expect(pickPdpReviews("frame").length).toBeLessThanOrEqual(3);
    // sanity: source has more than 3 reviews so the cap is meaningful
    expect(REVIEWS.length).toBeGreaterThan(3);
  });
});

describe("<PdpReviews />", () => {
  it("renders the section heading and aggregate rating", () => {
    render(
      <PdpReviews productSlug="monterey-futon" productName="Monterey Futon" />,
    );
    expect(screen.getByRole("heading", { name: /reviews/i })).toBeInTheDocument();
    const aggregate = screen.getByLabelText(/average rating .* out of 5 from \d+ reviews/i);
    expect(aggregate).toBeInTheDocument();
  });

  it("renders up to 3 review cards", () => {
    render(
      <PdpReviews productSlug="monterey-futon" productName="Monterey Futon" />,
    );
    const list = screen.getByRole("list");
    const cards = within(list).getAllByRole("listitem");
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(3);
  });

  it("renders a link to /reviews so customers can read more", () => {
    render(
      <PdpReviews productSlug="monterey-futon" productName="Monterey Futon" />,
    );
    const link = screen.getByRole("link", { name: /see all customer reviews/i });
    expect(link.getAttribute("href")).toBe("/reviews");
  });

  it("shows star indicators reflecting each review's rating", () => {
    render(
      <PdpReviews productSlug="monterey-futon" productName="Monterey Futon" />,
    );
    const ratings = screen.getAllByLabelText(/rated [1-5] out of 5/i);
    expect(ratings.length).toBeGreaterThan(0);
  });
});
