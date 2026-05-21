/**
 * cf-7y6f: HomeCategoryGridV9 image-priority LCP fix.
 * First 2 card background images must set priority=true so the browser
 * issues a preload for the above-fold LCP candidates. Images 2+ must stay
 * lazy to avoid wasting pre-LCP bandwidth.
 *
 * Encoding: priority=true  → next/image omits loading="lazy" (renders eager)
 *           priority=false → next/image emits loading="lazy" (default)
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { HomeCategoryGridV9 } from "@/components/home/HomeCategoryGridV9";

describe("HomeCategoryGridV9 — image priority (cf-7y6f)", () => {
  it("renders exactly 4 card background images", () => {
    const { container } = render(<HomeCategoryGridV9 />);
    const bgImages = container.querySelectorAll("[data-slot='card-bg-image']");
    expect(bgImages.length).toBe(4);
  });

  it("first 2 card background images are priority (not loading=lazy)", () => {
    const { container } = render(<HomeCategoryGridV9 />);
    const bgImages = container.querySelectorAll("[data-slot='card-bg-image']");
    expect(bgImages[0].getAttribute("loading")).not.toBe("lazy");
    expect(bgImages[1].getAttribute("loading")).not.toBe("lazy");
  });

  it("images 3 and 4 are lazy (no unnecessary preloads)", () => {
    const { container } = render(<HomeCategoryGridV9 />);
    const bgImages = container.querySelectorAll("[data-slot='card-bg-image']");
    expect(bgImages[2].getAttribute("loading")).toBe("lazy");
    expect(bgImages[3].getAttribute("loading")).toBe("lazy");
  });
});
