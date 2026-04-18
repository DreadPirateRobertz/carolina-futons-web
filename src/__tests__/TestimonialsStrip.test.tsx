import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import {
  TestimonialsStrip,
  TESTIMONIALS,
} from "@/components/site/TestimonialsStrip";

// Home-page social-proof strip. Data is static (3 curated quotes) — the
// component is pure presentational. Tests lock the contract miquella cares
// about: 3 quotes render, each exposes a star rating + customer name so
// screen readers and the visual design hold together.

describe("TestimonialsStrip", () => {
  it("renders exactly three testimonials", () => {
    render(<TestimonialsStrip />);
    expect(screen.getAllByTestId("testimonial")).toHaveLength(3);
  });

  it("renders each curated testimonial's name and city", () => {
    render(<TestimonialsStrip />);
    for (const t of TESTIMONIALS) {
      expect(screen.getByText(t.name)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(t.city, "i"))).toBeInTheDocument();
    }
  });

  it("renders a 5-star rating per testimonial (accessible name + visual stars)", () => {
    render(<TestimonialsStrip />);
    const cards = screen.getAllByTestId("testimonial");
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      const rating = within(card).getByRole("img", { name: /5 out of 5 stars/i });
      expect(rating).toBeInTheDocument();
      // Visual glyphs are decorative but should be present so the card reads
      // as a review even with CSS off.
      expect(rating.textContent).toMatch(/★{5}/);
    }
  });

  it("exposes the section as a labelled region for landmark navigation", () => {
    render(<TestimonialsStrip />);
    expect(
      screen.getByRole("region", { name: /what customers are saying/i }),
    ).toBeInTheDocument();
  });
});
