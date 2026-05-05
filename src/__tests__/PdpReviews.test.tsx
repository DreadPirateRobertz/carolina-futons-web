import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { PdpReviews, pickPdpReviews } from "@/components/product/PdpReviews";
import { REVIEWS } from "@/lib/discovery/reviews";

// PdpReviews renders the aggregate rating + up to 3 review cards on the PDP.
// The card source uses an honest fallback chain (productName -> category -> [])
// so a PDP without relevant reviews shows a real empty state instead of
// reviews from unrelated categories captioned as this product's. These tests
// pin that selection contract — the fallback order is the part most likely to
// silently regress (cf-xe54). After the cfw-49h GBP migration, reviews + stats
// arrive as props from the server-side loadReviews(); the fixture pool is the
// default to keep these tests deterministic.

const STATS = { rating: 4.8, count: 187 };

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

  it("filters from a caller-provided pool when reviews come from the GBP fetcher", () => {
    const pool = [
      ...REVIEWS,
      {
        id: "gbp-1",
        author: "Avery K.",
        category: "mattresses" as const,
        rating: 5 as const,
        title: "Fresh GBP review",
        body: "Loved it.",
        date: "2026-04-01",
        productName: "",
      },
    ];
    const picked = pickPdpReviews("Brand-New Mattress 9000", pool);
    expect(picked.some((r) => r.id === "gbp-1")).toBe(true);
  });
});

describe("<PdpReviews />", () => {
  it("renders the section heading and aggregate rating when stats and reviews exist", () => {
    render(
      <PdpReviews
        productSlug="monterey-futon"
        productName="Studio Murphy Bed"
        stats={STATS}
      />,
    );
    expect(screen.getByRole("heading", { name: /reviews/i })).toBeInTheDocument();
    expect(
      screen.getByLabelText(/average rating .* out of 5 from \d+ reviews/i),
    ).toBeInTheDocument();
  });

  it("renders up to 3 review cards when matches exist", () => {
    render(
      <PdpReviews
        productSlug="monterey-futon"
        productName="Studio Murphy Bed"
        stats={STATS}
      />,
    );
    const list = screen.getByRole("list");
    const cards = within(list).getAllByRole("listitem");
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(3);
  });

  it("renders a link to /reviews so customers can read more", () => {
    render(
      <PdpReviews
        productSlug="monterey-futon"
        productName="Studio Murphy Bed"
        stats={STATS}
      />,
    );
    const link = screen.getByRole("link", { name: /see all customer reviews/i });
    expect(link.getAttribute("href")).toBe("/reviews");
  });

  it("shows star indicators reflecting each review's rating", () => {
    render(
      <PdpReviews
        productSlug="monterey-futon"
        productName="Studio Murphy Bed"
        stats={STATS}
      />,
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

  it("suppresses the aggregate when stats are provided but no reviews match", () => {
    render(
      <PdpReviews
        productSlug="monterey-futon"
        productName="Wool Throw Pillow"
        stats={STATS}
      />,
    );
    expect(
      screen.queryByLabelText(/average rating/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/no reviews yet/i)).toBeInTheDocument();
  });

  it("renders review cards without an aggregate when stats are null", () => {
    render(
      <PdpReviews
        productSlug="unseeded-slug"
        productName="Studio Murphy Bed"
        stats={null}
      />,
    );
    expect(
      screen.queryByLabelText(/average rating/i),
    ).not.toBeInTheDocument();
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem").length).toBeGreaterThan(0);
  });

  it("renders a Share-Your-Photo CTA linking to /community-gallery/submit with the productSlug query", () => {
    render(
      <PdpReviews productSlug="monterey-futon" productName="Monterey Futon" />,
    );
    const link = screen.getByRole("link", { name: /share your photo/i });
    expect(link.getAttribute("href")).toBe(
      "/community-gallery/submit?productSlug=monterey-futon",
    );
  });

  it("renders the Share-Your-Photo CTA in the empty-reviews state too", () => {
    render(
      <PdpReviews productSlug="wool-throw-pillow" productName="Wool Throw Pillow" />,
    );
    const link = screen.getByRole("link", { name: /share your photo/i });
    expect(link.getAttribute("href")).toBe(
      "/community-gallery/submit?productSlug=wool-throw-pillow",
    );
  });

  it("URL-encodes productSlugs that contain unsafe characters in the CTA", () => {
    render(
      <PdpReviews productSlug="space slug" productName="Monterey Futon" />,
    );
    const link = screen.getByRole("link", { name: /share your photo/i });
    expect(link.getAttribute("href")).toBe(
      "/community-gallery/submit?productSlug=space%20slug",
    );
  });

  it("emits a machine-readable <time dateTime> for each review date", () => {
    const { container } = render(
      <PdpReviews
        productSlug="monterey-futon"
        productName="Studio Murphy Bed"
        stats={STATS}
      />,
    );
    const times = container.querySelectorAll("time[datetime]");
    expect(times.length).toBeGreaterThan(0);
    times.forEach((t) => {
      expect(t.getAttribute("datetime")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it("renders a friendly 'couldn't load reviews' state when the fetcher errored", () => {
    render(
      <PdpReviews
        productSlug="monterey-futon"
        productName="Studio Murphy Bed"
        stats={STATS}
        error
      />,
    );
    expect(screen.getByRole("heading", { name: /reviews/i })).toBeInTheDocument();
    expect(screen.getByText(/couldn.t load reviews/i)).toBeInTheDocument();
    // Card list and aggregate must both be suppressed under error.
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/average rating/i),
    ).not.toBeInTheDocument();
    // The "try the full reviews page" link still routes users somewhere useful.
    expect(
      screen.getByRole("link", { name: /full reviews page/i }).getAttribute("href"),
    ).toBe("/reviews");
  });
});
