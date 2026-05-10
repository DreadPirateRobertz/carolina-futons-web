import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import HomeLoading from "@/app/loading";

// cfw-fpv: home-page loading skeleton. Tests pin a11y attrs + structure
// blocks (filter-chip row + product-card grid) so a regression that
// shrinks the skeleton to a bare bones spinner gets caught.

describe("/loading (home)", () => {
  it("flags the loading region with aria-busy + aria-live=polite", () => {
    render(<HomeLoading />);
    const region = screen.getByTestId("home-loading");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("renders 8 skeleton product cards (matches one full row on lg + four rows on sm)", () => {
    const { container } = render(<HomeLoading />);
    const grid = container.querySelector('[data-slot="home-loading-grid"]');
    expect(grid).not.toBeNull();
    const cards = container.querySelectorAll('[data-slot="skeleton-card"]');
    expect(cards.length).toBe(8);
  });

  it("renders 5 chip-shaped skeletons (matches FilterFirst's 4 category chips + 'All' pill)", () => {
    const { container } = render(<HomeLoading />);
    const chips = container.querySelectorAll(".rounded-full");
    expect(chips.length).toBe(5);
  });
});
