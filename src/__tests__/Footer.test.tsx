import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Footer } from "@/components/site/Footer";

describe("Footer (cf-3qt.1 Phase 1)", () => {
  it("renders copyright with current year", () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`© ${year} Carolina Futons`))
    ).toBeInTheDocument();
  });

  it("renders Shop / Help / About column navigations", () => {
    render(<Footer />);
    ["Shop", "Help", "About"].forEach((heading) => {
      expect(
        screen.getByRole("navigation", { name: heading })
      ).toBeInTheDocument();
    });
  });

  it("renders footer Shop links with correct /shop/<slug> hrefs", () => {
    render(<Footer />);
    const expected = [
      ["Futons", "/shop/futon-frames"],
      ["Murphy Beds", "/shop/murphy-cabinet-beds"],
      ["Mattresses", "/shop/mattresses"],
      ["Platform Beds", "/shop/platform-beds"],
    ] as const;
    expected.forEach(([label, href]) => {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href,
      );
    });
  });

  it("exposes legal/accessibility links in the bottom row", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /privacy/i })).toHaveAttribute(
      "href",
      "/privacy"
    );
    expect(screen.getByRole("link", { name: /terms/i })).toHaveAttribute(
      "href",
      "/terms"
    );
    expect(
      screen.getByRole("link", { name: /accessibility/i })
    ).toHaveAttribute("href", "/accessibility");
  });

  it("applies h-cf-footer token so the 108px chrome spec is honored", () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector('footer[data-slot="site-footer"]');
    expect(footer).not.toBeNull();
    expect(footer?.className).toContain("h-cf-footer");
  });
});
