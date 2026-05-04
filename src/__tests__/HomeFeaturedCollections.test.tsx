import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  HomeFeaturedCollections,
  FEATURED_CATEGORY_SLUGS,
} from "@/components/home/HomeFeaturedCollections";

vi.mock("@/components/site/CategoryCardImage", () => ({
  CategoryCardImage: ({ slug }: { slug: string }) => (
    <div data-testid={`cat-img-${slug}`} />
  ),
}));

describe("HomeFeaturedCollections", () => {
  it("renders accessible section heading", () => {
    render(<HomeFeaturedCollections />);
    expect(screen.getByRole("heading", { name: "Shop by category" })).toBeInTheDocument();
  });

  it("renders exactly 4 cards", () => {
    render(<HomeFeaturedCollections />);
    expect(screen.getAllByRole("link")).toHaveLength(4);
  });

  it("renders cards in FEATURED_CATEGORY_SLUGS order with correct hrefs", () => {
    render(<HomeFeaturedCollections />);
    const links = screen.getAllByRole("link");
    FEATURED_CATEGORY_SLUGS.forEach((slug, i) => {
      expect(links[i]).toHaveAttribute("href", `/shop/${slug}`);
    });
  });

  it("excludes the derived sale category", () => {
    render(<HomeFeaturedCollections />);
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).not.toContain("/shop/mattresses-sale");
  });

  it("renders category names as card headings", () => {
    render(<HomeFeaturedCollections />);
    expect(screen.getByText("Futon Frames")).toBeInTheDocument();
    expect(screen.getByText("Murphy Cabinet Beds")).toBeInTheDocument();
    expect(screen.getByText("Platform Beds")).toBeInTheDocument();
    expect(screen.getByText("Mattresses")).toBeInTheDocument();
  });

  it("renders CategoryCardImage for categories with images", () => {
    render(<HomeFeaturedCollections />);
    expect(screen.getByTestId("cat-img-futon-frames")).toBeInTheDocument();
    expect(screen.getByTestId("cat-img-mattresses")).toBeInTheDocument();
  });

  it("links have focus-visible ring for WCAG 2.4.7", () => {
    render(<HomeFeaturedCollections />);
    const link = screen.getAllByRole("link")[0]!;
    expect(link.className).toContain("focus-visible:ring-2");
  });
});
