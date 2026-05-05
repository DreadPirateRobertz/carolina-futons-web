// cf-2t0y — compact StargazingHero (header band) must render moon, bear,
// and exactly 2 fireflies inside a 1920×240 viewBox so they stay visible at
// the ~213px header height.

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { StargazingHero } from "@/components/mascot/StargazingHero";

function getCompactSvg(container: HTMLElement) {
  const svg = container.querySelector("svg");
  expect(svg).not.toBeNull();
  return svg!;
}

describe("StargazingHero compact mode", () => {
  it("uses a 1920×240 viewBox sized for the site header band", () => {
    const { container } = render(<StargazingHero compact />);
    const svg = getCompactSvg(container);
    expect(svg.getAttribute("viewBox")).toBe("0 0 1920 240");
  });

  it("renders the moon with at least a 24px-radius solid disk", () => {
    const { container } = render(<StargazingHero compact />);
    const moon = container.querySelector('[data-slot="stargazing-moon"]');
    expect(moon).not.toBeNull();
    const disks = moon!.querySelectorAll("circle");
    const radii = Array.from(disks).map((c) =>
      Number(c.getAttribute("r") ?? "0"),
    );
    const solidDisk = radii.find((r) => r >= 24);
    expect(solidDisk).toBeDefined();
  });

  it("renders the bear silhouette inside the visible band (cy < 240)", () => {
    const { container } = render(<StargazingHero compact />);
    const bear = container.querySelector('[data-slot="stargazing-bear"]');
    expect(bear).not.toBeNull();
    // Bear group transform should translate to a y inside the band.
    const inner = bear!.querySelector("g");
    const transform = inner?.getAttribute("transform") ?? "";
    const match = transform.match(/translate\(\s*\d+\s+(\d+(?:\.\d+)?)/);
    expect(match).not.toBeNull();
    const cy = Number(match![1]);
    expect(cy).toBeGreaterThan(0);
    expect(cy).toBeLessThan(240);
  });

  it("renders exactly 2 fireflies", () => {
    const { container } = render(<StargazingHero compact />);
    const group = container.querySelector(
      '[data-slot="stargazing-fireflies-compact"]',
    );
    expect(group).not.toBeNull();
    const fireflies = group!.querySelectorAll('[data-slot="firefly"]');
    expect(fireflies.length).toBe(2);
  });

  it("freezes shimmer when reduceMotion is true (deterministic snapshot)", () => {
    const { container: a } = render(
      <StargazingHero compact time={0} reduceMotion />,
    );
    const { container: b } = render(
      <StargazingHero compact time={5} reduceMotion />,
    );
    // Firefly positions should not depend on `time` when reduceMotion=true.
    const aff = a.querySelectorAll('[data-slot="firefly"]');
    const bff = b.querySelectorAll('[data-slot="firefly"]');
    expect(aff[0].getAttribute("transform")).toBe(
      bff[0].getAttribute("transform"),
    );
  });

  it("default (non-compact) still renders the original 1920×800 viewBox", () => {
    const { container } = render(<StargazingHero />);
    const svg = getCompactSvg(container);
    expect(svg.getAttribute("viewBox")).toBe("0 0 1920 800");
  });
});
