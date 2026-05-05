import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { StargazingHeroHeader } from "@/components/mascot/StargazingHeroHeader";

describe("StargazingHeroHeader", () => {
  it("renders with the header viewBox geometry (1920x213, sliced)", () => {
    const { container } = render(<StargazingHeroHeader />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("viewBox", "0 0 1920 213");
    expect(svg).toHaveAttribute("preserveAspectRatio", "xMidYMid slice");
  });

  it("paints the moon at ≥24px diameter inside the visible band", () => {
    const { container } = render(<StargazingHeroHeader />);
    const moon = container.querySelector(
      '[data-slot="stargazing-header-moon"]',
    );
    expect(moon).not.toBeNull();
    // Solid moon disc — the radial-glow gradient is decorative.
    const discs = moon!.querySelectorAll("circle");
    const disc = Array.from(discs).find(
      (c) => Number(c.getAttribute("r")) === 24,
    );
    expect(disc).toBeTruthy();
    // Sanity: the moon group is translated into the top-right region of the band.
    const transform = moon!.getAttribute("transform") ?? "";
    expect(transform).toMatch(/translate\((\d+)\s+(\d+)\)/);
    const m = transform.match(/translate\((\d+)\s+(\d+)\)/);
    expect(Number(m![1])).toBeGreaterThan(960); // right half
    expect(Number(m![2])).toBeLessThan(213); // inside band
  });

  it("renders exactly two fireflies", () => {
    const { container } = render(<StargazingHeroHeader />);
    const ff = container.querySelector(
      '[data-slot="stargazing-header-fireflies"]',
    );
    expect(ff).not.toBeNull();
    // Each firefly is a <g> wrapper containing a glow + core circle.
    expect(ff!.querySelectorAll("g")).toHaveLength(2);
  });

  it("renders the bear silhouette", () => {
    // The bear group has multiple ellipses (body, head, muzzle, paw) and circles
    // (ears, eyes, nostril). Rather than tag each, assert the top-level svg has
    // a translate(960 ...) bear group — the only one centered horizontally.
    const { container } = render(<StargazingHeroHeader />);
    const groups = container.querySelectorAll("g[transform^='translate(960']");
    expect(groups.length).toBeGreaterThan(0);
  });

  it("freezes animation when reduceMotion is true", () => {
    // Stars/fireflies use sin(t * …) for opacity. With reduceMotion+time=0 each
    // firefly's `a = 0.5 + 0.5 * sin(0 + ph)` is deterministic across renders.
    const a = render(<StargazingHeroHeader reduceMotion time={0} />);
    const b = render(<StargazingHeroHeader reduceMotion time={5} />);
    expect(a.container.innerHTML).toBe(b.container.innerHTML);
    a.unmount();
    b.unmount();
  });

  it("animates between frames when reduceMotion is false", () => {
    const a = render(<StargazingHeroHeader time={0} />);
    const b = render(<StargazingHeroHeader time={1.5} />);
    expect(a.container.innerHTML).not.toBe(b.container.innerHTML);
  });
});
