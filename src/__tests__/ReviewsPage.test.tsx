import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import ReviewsPage, { metadata } from "@/app/reviews/page";
import { ReviewFilter } from "@/app/reviews/ReviewFilter";
import { REVIEWS } from "@/lib/discovery/reviews";

// cf-3qt.8.D / cfw-49h: smoke test pinning /reviews — metadata export, h1,
// chip filter wiring, and the all-category default listing. After the GBP
// migration the page is an async server component that awaits loadReviews();
// we mock that to return the fixture pool deterministically.

vi.mock("@/lib/discovery/google-reviews", () => ({
  loadReviews: vi.fn(async () => ({
    reviews: REVIEWS,
    averageRating: 4.8,
    totalReviewCount: REVIEWS.length,
    source: "fixture",
    ok: true,
  })),
}));

async function renderReviewsPage() {
  const ui = await ReviewsPage();
  return render(ui);
}

describe("ReviewsPage", () => {
  it("exports metadata with a customer-reviews title", () => {
    expect(metadata.title).toMatch(/Customer Reviews.*Carolina Futons/);
    expect(typeof metadata.description).toBe("string");
  });

  it("renders the hero h1", async () => {
    await renderReviewsPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /what customers say/i }),
    ).toBeTruthy();
  });

  it("renders every loaded review by default via ReviewFilter", () => {
    render(<ReviewFilter reviews={REVIEWS} />);
    for (const review of REVIEWS) {
      expect(
        screen.getByRole("heading", { level: 3, name: review.title }),
      ).toBeTruthy();
    }
  });

  it("filters reviews down to a single category when a chip is selected", () => {
    render(<ReviewFilter reviews={REVIEWS} />);
    const framesChip = screen.getByRole("tab", { name: /frames/i });
    fireEvent.click(framesChip);
    for (const review of REVIEWS) {
      const heading = screen.queryByRole("heading", {
        level: 3,
        name: review.title,
      });
      if (review.category === "frames") {
        expect(heading).not.toBeNull();
      } else {
        expect(heading).toBeNull();
      }
    }
  });
});
