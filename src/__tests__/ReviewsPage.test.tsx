import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import ReviewsPage, { metadata } from "@/app/reviews/page";
import { REVIEWS } from "@/lib/discovery/reviews";

// cf-3qt.8.D: smoke test pinning /reviews — metadata export, h1, chip filter
// wiring against REVIEWS seed data, and the all-category default listing.

describe("ReviewsPage", () => {
  it("exports metadata with a customer-reviews title", () => {
    expect(metadata.title).toMatch(/Customer Reviews.*Carolina Futons/);
    expect(typeof metadata.description).toBe("string");
  });

  it("renders the hero h1", () => {
    render(<ReviewsPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /what customers say/i }),
    ).toBeTruthy();
  });

  it("renders every seed review by default", () => {
    render(<ReviewsPage />);
    for (const review of REVIEWS) {
      expect(
        screen.getByRole("heading", { level: 3, name: review.title }),
      ).toBeTruthy();
    }
  });

  it("filters reviews down to a single category when a chip is selected", () => {
    render(<ReviewsPage />);
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
