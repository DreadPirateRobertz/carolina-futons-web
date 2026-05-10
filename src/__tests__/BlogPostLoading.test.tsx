import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import BlogPostLoading from "@/app/blog/[slug]/loading";

// cfw-0io: blog post loading skeleton during cold ISR resolution.

describe("/blog/[slug]/loading", () => {
  it("flags the loading region with aria-busy + aria-live=polite", () => {
    render(<BlogPostLoading />);
    const region = screen.getByTestId("blog-post-loading");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("renders a 16/9 hero image placeholder (matches the real BlogPostHero)", () => {
    const { container } = render(<BlogPostLoading />);
    const hero = container.querySelector('[data-slot="blog-post-loading-hero"]');
    expect(hero).not.toBeNull();
    expect(hero?.className).toMatch(/aspect-\[16\/9\]/);
  });

  it("renders 11 body-text skeleton lines", () => {
    const { container } = render(<BlogPostLoading />);
    const body = container.querySelector('[data-slot="blog-post-loading-body"]');
    expect(body).not.toBeNull();
    expect(body?.children.length).toBe(11);
  });
});
