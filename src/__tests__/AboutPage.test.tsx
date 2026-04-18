import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import AboutPage from "@/app/about/page";

// cf-about-hero: /about was text-only; the hero banner anchors the page
// visually before the long-form copy. We assert on role + alt rather than
// URL specifics so swapping the CDN photo later doesn't churn these tests.
describe("AboutPage hero banner", () => {
  it("renders a hero image at the top of the page", () => {
    render(<AboutPage />);
    const hero = screen.getByTestId("about-hero-image");
    expect(hero).toBeTruthy();
    expect(hero.tagName).toBe("IMG");
  });

  it("gives the hero image a non-empty, descriptive alt", () => {
    render(<AboutPage />);
    const hero = screen.getByTestId("about-hero-image");
    const alt = hero.getAttribute("alt") ?? "";
    expect(alt.length).toBeGreaterThan(0);
    // Should say something about the brand/product, not just "image"
    expect(alt).toMatch(/futon|carolina|hendersonville|showroom|hardwood/i);
  });
});
