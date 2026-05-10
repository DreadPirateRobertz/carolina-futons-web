import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import CommunityGalleryLoading from "@/app/community-gallery/loading";

// cfw-9g6: gallery loading skeleton during cold ISR resolution.

describe("/community-gallery/loading", () => {
  it("flags the loading region with aria-busy + aria-live=polite", () => {
    render(<CommunityGalleryLoading />);
    const region = screen.getByTestId("community-gallery-loading");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("renders 12 photo-card skeletons in the masonry grid", () => {
    const { container } = render(<CommunityGalleryLoading />);
    const grid = container.querySelector(
      '[data-slot="community-gallery-loading-grid"]',
    );
    expect(grid).not.toBeNull();
    expect(grid?.children.length).toBe(12);
  });

  it("uses CSS-columns masonry classes that match the real grid", () => {
    const { container } = render(<CommunityGalleryLoading />);
    const grid = container.querySelector(
      '[data-slot="community-gallery-loading-grid"]',
    );
    // Real grid: columns-1 sm:columns-2 lg:columns-3 xl:columns-4.
    expect(grid?.className).toMatch(/columns-1/);
    expect(grid?.className).toMatch(/sm:columns-2/);
    expect(grid?.className).toMatch(/lg:columns-3/);
    expect(grid?.className).toMatch(/xl:columns-4/);
  });
});
