import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { PdpReviews, pickPdpReviews } from "@/components/product/PdpReviews";
import { REVIEWS } from "@/lib/discovery/reviews";

// PdpReviews renders the aggregate rating + up to 3 review cards on the PDP.
// The card source uses an honest fallback chain (productName -> category -> [])
// so a PDP without relevant reviews shows a real empty state instead of
// reviews from unrelated categories captioned as this product's. These tests
// pin that selection contract — the fallback order is the part most likely
// to silently regress (cf-xe54).

describe("pickPdpReviews", () => {
  it("returns reviews matching the exact productName when present", () => {
    const picked = pickPdpReviews("Studio Murphy Bed");
    expect(picked.length).toBeGreaterThan(0);
    expect(picked.every((r) => r.productName === "Studio Murphy Bed")).toBe(true);
  });

  it("falls back to the inferred category when no productName matches (mattress keyword)", () => {
    const picked = pickPdpReviews("Brand-New Mattress 9000");
    expect(picked.length).toBeGreaterThan(0);
    expect(picked.every((r) => r.category === "mattresses")).toBe(true);
  });

  it("falls back to category for murphy products by keyword", () => {
    const picked = pickPdpReviews("Bespoke Murphy Cabinet");
    expect(picked.every((r) => r.category === "murphy-beds")).toBe(true);
  });

  it.each(["frame", "daybed", "futon"])(
    "infers the frames category from the %s keyword",
    (keyword) => {
      const picked = pickPdpReviews(`Generic ${keyword} 2000`);
      expect(picked.length).toBeGreaterThan(0);
      expect(picked.every((r) => r.category === "frames")).toBe(true);
    },
  );

  it("returns [] when neither productName nor category matches", () => {
    const picked = pickPdpReviews("Wool Throw Pillow");
    expect(picked).toEqual([]);
  });

  it("returns [] for a generic name with no recognized keyword", () => {
    expect(pickPdpReviews("")).toEqual([]);
    expect(pickPdpReviews("Random Lifestyle Accessory")).toEqual([]);
  });

  it("returns at most 3 review cards for a category with many entries", () => {
    expect(pickPdpReviews("frame").length).toBeLessThanOrEqual(3);
    // sanity: source has more than 3 reviews so the cap is meaningful
    expect(REVIEWS.length).toBeGreaterThan(3);
  });
});

describe("<PdpReviews />", () => {
  it("renders the section heading and aggregate rating when stats and reviews exist", () => {
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

  it("renders the empty-state when no reviews match the product", () => {
    render(
      <PdpReviews productSlug="wool-throw-pillow" productName="Wool Throw Pillow" />,
    );
    expect(screen.getByRole("heading", { name: /reviews/i })).toBeInTheDocument();
    expect(screen.getByText(/no reviews yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    // Aggregate must NOT render when no review cards are shown — the previous
    // bug was a confident "4.7 ★ (23)" appearing with zero cards underneath.
    expect(
      screen.queryByLabelText(/average rating/i),
    ).not.toBeInTheDocument();
  });

  it("suppresses the aggregate when stats exist but no reviews match", () => {
    // monterey-futon has SEED stats; productName "Mismatched Product" has no
    // matching review in REVIEWS. We must not show the seed aggregate alone.
    render(
      <PdpReviews productSlug="monterey-futon" productName="Wool Throw Pillow" />,
    );
    expect(
      screen.queryByLabelText(/average rating/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/no reviews yet/i)).toBeInTheDocument();
  });

  it("renders review cards without an aggregate when slug is unseeded but reviews match", () => {
    // unseeded slug -> getReviewStats returns null; but productName matches an
    // exact review entry. Cards render; aggregate is omitted.
    render(
      <PdpReviews productSlug="unseeded-slug" productName="Studio Murphy Bed" />,
    );
    expect(
      screen.queryByLabelText(/average rating/i),
    ).not.toBeInTheDocument();
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem").length).toBeGreaterThan(0);
  });

  it("emits a machine-readable <time dateTime> for each review date", () => {
    const { container } = render(
      <PdpReviews productSlug="monterey-futon" productName="Monterey Futon" />,
    );
    const times = container.querySelectorAll("time[datetime]");
    expect(times.length).toBeGreaterThan(0);
    times.forEach((t) => {
      // ISO 8601 yyyy-mm-dd from the static REVIEWS list
      expect(t.getAttribute("datetime")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
