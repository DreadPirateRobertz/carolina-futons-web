import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import HomePage from "@/app/page";
import { SHOP_CATEGORIES } from "@/lib/shop/categories";

// cf-3qt.7.M.2 (cf-swsg): pin the home-page section contract after wrapping
// Shop-by-category heading + cards in HeroReveal. We don't assert animation
// values — jsdom has no scroll and Framer honors reduced-motion at the
// variant level, so tests stay on what users can observe statically.

describe("HomePage", () => {
  it("renders the hero headline", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /quality futons.*for your home/i,
      }),
    ).toBeTruthy();
  });

  it("renders the Shop by category section heading", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 2, name: /shop by category/i }),
    ).toBeTruthy();
  });

  it("renders a card link per SHOP_CATEGORIES entry pointing at /shop/{slug}", () => {
    render(<HomePage />);
    for (const category of SHOP_CATEGORIES) {
      // Each category card has a browse CTA plus a parent Link — match on
      // the h3 and then walk up to confirm the href.
      const h3 = screen.getByRole("heading", { level: 3, name: category.name });
      const link = h3.closest("a");
      expect(link).toBeTruthy();
      expect(link?.getAttribute("href")).toBe(`/shop/${category.slug}`);
    }
  });

  it("keeps the View all → link on the Shop by category section", () => {
    render(<HomePage />);
    const viewAll = screen.getByRole("link", { name: /view all/i });
    expect(viewAll.getAttribute("href")).toBe("/shop");
  });

  it("renders the three value-prop headings", () => {
    render(<HomePage />);
    expect(screen.getByText(/hardwood, not plywood/i)).toBeTruthy();
    expect(screen.getByText(/sleep on it first/i)).toBeTruthy();
    expect(screen.getByText(/white-glove delivery/i)).toBeTruthy();
  });
});
