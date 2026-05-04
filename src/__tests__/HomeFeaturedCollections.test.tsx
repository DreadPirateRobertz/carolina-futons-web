import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeFeaturedCollections } from "@/components/home/HomeFeaturedCollections";

describe("HomeFeaturedCollections", () => {
  it("renders section with accessible heading", () => {
    render(<HomeFeaturedCollections />);
    expect(screen.getByRole("heading", { name: "Shop by category" })).toBeInTheDocument();
  });

  it("shows exactly 4 category cards", () => {
    render(<HomeFeaturedCollections />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
  });

  it("links to correct PLP paths", () => {
    render(<HomeFeaturedCollections />);
    expect(screen.getByRole("link", { name: /Futon Frames/i })).toHaveAttribute(
      "href",
      "/shop/futon-frames",
    );
    expect(screen.getByRole("link", { name: /Murphy Cabinet Beds/i })).toHaveAttribute(
      "href",
      "/shop/murphy-cabinet-beds",
    );
    expect(screen.getByRole("link", { name: /Platform Beds/i })).toHaveAttribute(
      "href",
      "/shop/platform-beds",
    );
    expect(screen.getByRole("link", { name: /Mattresses/i })).toHaveAttribute(
      "href",
      "/shop/mattresses",
    );
  });

  it("excludes the derived sale category", () => {
    render(<HomeFeaturedCollections />);
    expect(
      screen.queryByRole("link", { name: /Sale/i }),
    ).not.toBeInTheDocument();
  });

  it("renders category names as headings inside links", () => {
    render(<HomeFeaturedCollections />);
    expect(screen.getByText("Futon Frames")).toBeInTheDocument();
    expect(screen.getByText("Murphy Cabinet Beds")).toBeInTheDocument();
    expect(screen.getByText("Platform Beds")).toBeInTheDocument();
    expect(screen.getByText("Mattresses")).toBeInTheDocument();
  });
});
