import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

// Mock useTimeOfDay so tests control phase and reduceMotion deterministically.
const mockState = {
  phase: "day" as "night" | "dawn" | "day" | "dusk",
  time: 0,
  reduceMotion: false,
  mounted: true,
};

vi.mock("@/lib/hooks/useTimeOfDay", () => ({
  useTimeOfDay: () => mockState,
}));

import { LivingFooterBg } from "@/components/site/LivingFooterBg";

beforeEach(() => {
  mockState.phase = "day";
  mockState.reduceMotion = false;
  mockState.mounted = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LivingFooterBg — structure", () => {
  it("renders an aria-hidden container", () => {
    const { container } = render(<LivingFooterBg />);
    const el = container.querySelector("[aria-hidden='true']");
    expect(el).not.toBeNull();
  });

  it("renders four gradient layer divs (one per phase)", () => {
    const { container } = render(<LivingFooterBg />);
    // The outermost aria-hidden div plus four child gradient divs
    const root = container.querySelector("[aria-hidden='true']") as HTMLElement;
    const layers = Array.from(root.children).filter(
      (c) => (c as HTMLElement).style.background?.startsWith("linear-gradient"),
    );
    expect(layers.length).toBe(4);
  });

  it("active phase layer is fully opaque when mounted, others are transparent", () => {
    mockState.phase = "night";
    mockState.mounted = true;
    const { container } = render(<LivingFooterBg />);
    const root = container.querySelector("[aria-hidden='true']") as HTMLElement;
    const layers = Array.from(root.children).filter(
      (c) => (c as HTMLElement).style.background?.startsWith("linear-gradient"),
    ) as HTMLElement[];
    const visible = layers.filter((l) => l.style.opacity === "1");
    const hidden = layers.filter((l) => l.style.opacity === "0");
    expect(visible.length).toBe(1);
    expect(hidden.length).toBe(3);
  });

  it("all gradient layers are transparent before mount (no SSR flash)", () => {
    mockState.phase = "day";
    mockState.mounted = false;
    const { container } = render(<LivingFooterBg />);
    const root = container.querySelector("[aria-hidden='true']") as HTMLElement;
    const layers = Array.from(root.children).filter(
      (c) => (c as HTMLElement).style.background?.startsWith("linear-gradient"),
    ) as HTMLElement[];
    expect(layers.filter((l) => l.style.opacity === "1").length).toBe(0);
  });
});

describe("LivingFooterBg — night stars", () => {
  it("renders the star SVG when phase is night", () => {
    mockState.phase = "night";
    const { container } = render(<LivingFooterBg />);
    const svg = container.querySelector("svg[viewBox='0 0 100 100']");
    expect(svg).not.toBeNull();
  });

  it("star SVG container is aria-hidden", () => {
    mockState.phase = "night";
    const { container } = render(<LivingFooterBg />);
    const root = container.querySelector("[aria-hidden='true']") as HTMLElement;
    // The outermost wrapper carries aria-hidden — confirms entire animated bg is decorative
    expect(root?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders 14 star circles", () => {
    mockState.phase = "night";
    const { container } = render(<LivingFooterBg />);
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(14);
  });

  it("star circles get twinkle animation when motion allowed", () => {
    mockState.phase = "night";
    mockState.reduceMotion = false;
    const { container } = render(<LivingFooterBg />);
    const circle = container.querySelector("circle") as SVGCircleElement;
    expect(circle.style.animation).toContain("cf-star-twinkle");
  });

  it("star circles get static opacity under reduced-motion", () => {
    mockState.phase = "night";
    mockState.reduceMotion = true;
    const { container } = render(<LivingFooterBg />);
    const circle = container.querySelector("circle") as SVGCircleElement;
    expect(circle.style.animation).toBeFalsy();
    expect(circle.style.opacity).toBeTruthy();
  });

  it("star SVG is opaque when phase is night and mounted", () => {
    mockState.phase = "night";
    mockState.mounted = true;
    const { container } = render(<LivingFooterBg />);
    const svg = container.querySelector("svg[viewBox='0 0 100 100']") as SVGElement;
    expect(svg.style.opacity).toBe("1");
  });

  it("star SVG is transparent when phase is day", () => {
    mockState.phase = "day";
    const { container } = render(<LivingFooterBg />);
    const svg = container.querySelector("svg[viewBox='0 0 100 100']") as SVGElement;
    expect(svg.style.opacity).toBe("0");
  });
});

describe("LivingFooterBg — dawn/dusk orbs", () => {
  it("renders two orb divs (dawn + dusk) always", () => {
    const { container } = render(<LivingFooterBg />);
    const root = container.querySelector("[aria-hidden='true']") as HTMLElement;
    const orbs = Array.from(root.children).filter(
      (c) => (c as HTMLElement).style.background?.startsWith("radial-gradient"),
    );
    expect(orbs.length).toBe(2);
  });

  it("dawn orb is opaque when phase is dawn", () => {
    mockState.phase = "dawn";
    mockState.mounted = true;
    const { container } = render(<LivingFooterBg />);
    const root = container.querySelector("[aria-hidden='true']") as HTMLElement;
    const orbs = Array.from(root.children).filter(
      (c) => (c as HTMLElement).style.background?.startsWith("radial-gradient"),
    ) as HTMLElement[];
    const visibleOrbs = orbs.filter((o) => o.style.opacity === "1");
    expect(visibleOrbs.length).toBe(1);
  });

  it("dusk orb gets drift animation when phase is dusk and motion allowed", () => {
    mockState.phase = "dusk";
    mockState.reduceMotion = false;
    const { container } = render(<LivingFooterBg />);
    const root = container.querySelector("[aria-hidden='true']") as HTMLElement;
    const orbs = Array.from(root.children).filter(
      (c) => (c as HTMLElement).style.background?.startsWith("radial-gradient"),
    ) as HTMLElement[];
    const animated = orbs.filter((o) => o.style.animation?.includes("cf-footer-orb"));
    expect(animated.length).toBe(1);
  });

  it("no orb animation under reduced-motion", () => {
    mockState.phase = "dawn";
    mockState.reduceMotion = true;
    const { container } = render(<LivingFooterBg />);
    const root = container.querySelector("[aria-hidden='true']") as HTMLElement;
    const orbs = Array.from(root.children).filter(
      (c) => (c as HTMLElement).style.background?.startsWith("radial-gradient"),
    ) as HTMLElement[];
    const animated = orbs.filter((o) => o.style.animation);
    expect(animated.length).toBe(0);
  });
});

describe("LivingFooterBg — gradient drift animation", () => {
  it("active gradient layer gets drift animation when motion allowed", () => {
    mockState.phase = "day";
    mockState.reduceMotion = false;
    const { container } = render(<LivingFooterBg />);
    const root = container.querySelector("[aria-hidden='true']") as HTMLElement;
    const activeLayers = Array.from(root.children).filter(
      (c) =>
        (c as HTMLElement).style.background?.startsWith("linear-gradient") &&
        (c as HTMLElement).style.opacity === "1",
    ) as HTMLElement[];
    expect(activeLayers[0].style.animation).toContain("cf-footer-drift");
  });

  it("inactive gradient layers have no animation", () => {
    mockState.phase = "day";
    mockState.reduceMotion = false;
    const { container } = render(<LivingFooterBg />);
    const root = container.querySelector("[aria-hidden='true']") as HTMLElement;
    const inactiveLayers = Array.from(root.children).filter(
      (c) =>
        (c as HTMLElement).style.background?.startsWith("linear-gradient") &&
        (c as HTMLElement).style.opacity === "0",
    ) as HTMLElement[];
    expect(inactiveLayers.filter((l) => l.style.animation).length).toBe(0);
  });

  it("active gradient layer has no animation under reduced-motion", () => {
    mockState.phase = "day";
    mockState.reduceMotion = true;
    const { container } = render(<LivingFooterBg />);
    const root = container.querySelector("[aria-hidden='true']") as HTMLElement;
    const activeLayers = Array.from(root.children).filter(
      (c) =>
        (c as HTMLElement).style.background?.startsWith("linear-gradient") &&
        (c as HTMLElement).style.opacity === "1",
    ) as HTMLElement[];
    expect(activeLayers[0]?.style.animation).toBeFalsy();
  });
});

describe("LivingFooterBg — orb symmetry", () => {
  it("only dawn orb is visible during dawn phase", () => {
    mockState.phase = "dawn";
    mockState.mounted = true;
    const { container } = render(<LivingFooterBg />);
    const root = container.querySelector("[aria-hidden='true']") as HTMLElement;
    const orbs = Array.from(root.children).filter(
      (c) => (c as HTMLElement).style.background?.startsWith("radial-gradient"),
    ) as HTMLElement[];
    expect(orbs.filter((o) => o.style.opacity === "1").length).toBe(1);
    expect(orbs.filter((o) => o.style.opacity === "0").length).toBe(1);
  });

  it("dawn orb is invisible during dusk phase", () => {
    mockState.phase = "dusk";
    mockState.mounted = true;
    const { container } = render(<LivingFooterBg />);
    const root = container.querySelector("[aria-hidden='true']") as HTMLElement;
    const orbs = Array.from(root.children).filter(
      (c) => (c as HTMLElement).style.background?.startsWith("radial-gradient"),
    ) as HTMLElement[];
    const visible = orbs.filter((o) => o.style.opacity === "1");
    const hidden = orbs.filter((o) => o.style.opacity === "0");
    expect(visible.length).toBe(1);
    expect(hidden.length).toBe(1);
  });
});
