import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import BlogLoading from "@/app/blog/loading";

// cfw-yl1: blog loading skeleton during cold ISR resolution. Tests pin
// the a11y attrs + the post-list structure so a regression that
// shrinks the skeleton to a bare bones spinner gets caught.

describe("/blog/loading", () => {
  it("flags the loading region with aria-busy + aria-live=polite", () => {
    render(<BlogLoading />);
    const region = screen.getByTestId("blog-loading");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("renders 6 skeleton post placeholders", () => {
    const { container } = render(<BlogLoading />);
    const list = container.querySelector('[data-slot="blog-loading-list"]');
    expect(list).not.toBeNull();
    expect(list?.children.length).toBe(6);
  });
});
