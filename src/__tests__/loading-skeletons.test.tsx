import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { SkeletonCard } from "@/components/ui/SkeletonCard";
import PlpLoading from "@/app/shop/[category]/loading";
import PdpLoading from "@/app/products/[slug]/loading";

afterEach(() => {
  cleanup();
});

describe("SkeletonCard", () => {
  it("renders as an <li> so it can drop into the same <ul> grid as ProductCard", () => {
    const { container } = render(
      <ul>
        <SkeletonCard />
      </ul>,
    );
    const slot = container.querySelector("[data-slot='skeleton-card']");
    expect(slot).not.toBeNull();
    expect(slot!.tagName).toBe("LI");
  });

  it("is hidden from assistive tech (aria-hidden) so SR users don't hear pulse noise", () => {
    const { container } = render(
      <ul>
        <SkeletonCard />
      </ul>,
    );
    const slot = container.querySelector("[data-slot='skeleton-card']");
    expect(slot!.getAttribute("aria-hidden")).toBe("true");
  });

  it("contains the three placeholder rows (image, title, price)", () => {
    const { container } = render(
      <ul>
        <SkeletonCard />
      </ul>,
    );
    expect(
      container.querySelector("[data-slot='skeleton-card-image']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-slot='skeleton-card-title']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-slot='skeleton-card-price']"),
    ).not.toBeNull();
  });
});

describe("PlpLoading", () => {
  it("renders exactly 12 skeleton cards inside the loading grid", () => {
    const { container } = render(<PlpLoading />);
    const grid = container.querySelector("[data-slot='plp-loading-grid']");
    expect(grid).not.toBeNull();
    const cards = grid!.querySelectorAll("[data-slot='skeleton-card']");
    expect(cards.length).toBe(12);
  });

  it("marks the main region as aria-busy for assistive tech", () => {
    const { container } = render(<PlpLoading />);
    const main = container.querySelector("[data-slot='plp-loading']");
    expect(main!.getAttribute("aria-busy")).toBe("true");
    expect(main!.getAttribute("aria-live")).toBe("polite");
  });

  it("mirrors the real PLP grid responsive class contract so layout doesn't jump on hydrate", () => {
    const { container } = render(<PlpLoading />);
    const grid = container.querySelector("[data-slot='plp-loading-grid']");
    expect(grid!.className).toMatch(/grid-cols-1/);
    expect(grid!.className).toMatch(/sm:grid-cols-2/);
    expect(grid!.className).toMatch(/lg:grid-cols-3/);
  });
});

describe("PdpLoading", () => {
  it("renders a two-column layout with gallery + info placeholders", () => {
    const { container } = render(<PdpLoading />);
    const main = container.querySelector("[data-slot='pdp-loading']");
    expect(main).not.toBeNull();
    expect(main!.getAttribute("aria-busy")).toBe("true");
    expect(
      container.querySelector("[data-slot='pdp-loading-gallery']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-slot='pdp-loading-info']"),
    ).not.toBeNull();
  });

  it("renders 4 thumbnail placeholders under the main gallery image", () => {
    const { container } = render(<PdpLoading />);
    const gallery = container.querySelector(
      "[data-slot='pdp-loading-gallery']",
    );
    // 1 hero + 4 thumbs = 5 skeleton primitives inside the gallery column
    const skeletons = gallery!.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBe(5);
  });

  // cf-urbq: breadcrumb skeleton wrapper must use text-muted-foreground
  it("breadcrumb skeleton wrapper uses text-muted-foreground", () => {
    const { container } = render(<PdpLoading />);
    const main = container.querySelector("[data-slot='pdp-loading']");
    expect(main!.querySelector(".text-muted-foreground")).not.toBeNull();
    expect(main!.querySelector(".text-muted-foreground")).toHaveClass("text-muted-foreground");
  });
});

describe("PlpLoading — breadcrumb contrast (cf-urbq)", () => {
  // cf-urbq: breadcrumb skeleton wrapper must use text-muted-foreground
  it("breadcrumb skeleton wrapper uses text-muted-foreground", () => {
    const { container } = render(<PlpLoading />);
    const main = container.querySelector("[data-slot='plp-loading']");
    expect(main!.querySelector(".text-muted-foreground")).not.toBeNull();
    expect(main!.querySelector(".text-muted-foreground")).toHaveClass("text-muted-foreground");
  });
});
