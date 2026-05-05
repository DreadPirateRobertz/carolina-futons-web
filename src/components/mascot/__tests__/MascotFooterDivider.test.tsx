import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

// cf-c8dc: contract for the night-scene footer divider — verifies the
// animation surface (breathing bear, twinkling stars, drifting fireflies)
// and that all motion collapses when the user prefers reduced motion.

const mocks = vi.hoisted(() => ({
  prefersReducedMotion: false as boolean | null,
  bearAnimate: undefined as unknown,
  pawAnimate: undefined as unknown,
  starAnimates: [] as unknown[],
  fireflyAnimates: [] as unknown[],
}));

type MotionProps = {
  children?: ReactNode;
  animate?: unknown;
  initial?: unknown;
  transition?: unknown;
  style?: Record<string, unknown>;
  [key: string]: unknown;
};

vi.mock("framer-motion", () => {
  function passthrough(tag: "g" | "circle") {
    function MotionPassthrough({
      children,
      animate,
      initial: _i,
      transition: _t,
      style,
      ...rest
    }: MotionProps) {
      const slot = (rest as { "data-slot"?: string })["data-slot"];
      if (tag === "g" && slot === "footer-bear") {
        mocks.bearAnimate = animate;
      } else if (tag === "g" && slot === "footer-bear-paw") {
        mocks.pawAnimate = animate;
      } else if (tag === "circle") {
        // Star elements live in the stars group; everything else is a firefly
        // (we identify by the presence of a filter style — fireflies have a glow)
        if (style && typeof style.filter === "string") {
          mocks.fireflyAnimates.push(animate);
        } else {
          mocks.starAnimates.push(animate);
        }
      }
      const Tag = tag;
      return (
        <Tag {...(rest as Record<string, unknown>)} style={style as Record<string, unknown>}>
          {children}
        </Tag>
      );
    }
    MotionPassthrough.displayName = `MotionPassthrough(${tag})`;
    return MotionPassthrough;
  }
  return {
    motion: { g: passthrough("g"), circle: passthrough("circle") },
    useReducedMotion: () => mocks.prefersReducedMotion,
  };
});

import { MascotFooterDivider } from "@/components/mascot/MascotFooterDivider";

beforeEach(() => {
  mocks.prefersReducedMotion = false;
  mocks.bearAnimate = undefined;
  mocks.pawAnimate = undefined;
  mocks.starAnimates = [];
  mocks.fireflyAnimates = [];
});

describe("MascotFooterDivider — structure", () => {
  it("renders an svg with data-slot='mascot-footer-divider'", () => {
    const { container } = render(<MascotFooterDivider />);
    const svg = container.querySelector("[data-slot='mascot-footer-divider']");
    expect(svg?.tagName.toLowerCase()).toBe("svg");
  });

  it("preserves the v3fd-sky gradient (HomePage regression guard depends on it)", () => {
    const { container } = render(<MascotFooterDivider />);
    expect(container.querySelector("#v3fd-sky")).not.toBeNull();
  });

  it("sky gradient ends at the cf-footer-bg color (#1E2A3A) so the divider merges into the footer", () => {
    const { container } = render(<MascotFooterDivider />);
    const stops = container.querySelectorAll("#v3fd-sky stop");
    const last = stops[stops.length - 1];
    expect(last?.getAttribute("stop-color")?.toLowerCase()).toBe("#1e2a3a");
  });

  it("renders a watchful sitting bear (distinct from header's lying stargazer) with a waving paw", () => {
    const { container } = render(<MascotFooterDivider />);
    expect(container.querySelector("[data-slot='footer-bear']")).not.toBeNull();
    expect(container.querySelector("[data-slot='footer-bear-paw']")).not.toBeNull();
    // The watchful pose has no sleeping-Z markers (those marked the prior pose).
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(texts).not.toEqual(expect.arrayContaining(["Z"]));
  });

  it("exposes data-slots for stars and fireflies", () => {
    const { container } = render(<MascotFooterDivider />);
    expect(container.querySelector("[data-slot='footer-stars']")).not.toBeNull();
    expect(container.querySelector("[data-slot='footer-fireflies']")).not.toBeNull();
  });
});

describe("MascotFooterDivider — animation active (reduced motion off)", () => {
  it("bear breathes (scaleY array)", () => {
    mocks.prefersReducedMotion = false;
    render(<MascotFooterDivider />);
    expect(mocks.bearAnimate).toEqual({ scaleY: [1, 1.045, 1] });
  });

  it("bear waves (paw rotate is an array)", () => {
    mocks.prefersReducedMotion = false;
    render(<MascotFooterDivider />);
    const rotate = (mocks.pawAnimate as { rotate?: unknown } | undefined)?.rotate;
    expect(Array.isArray(rotate)).toBe(true);
    expect((rotate as unknown[]).length).toBeGreaterThanOrEqual(3);
  });

  it("stars twinkle (every star animate has an opacity array)", () => {
    mocks.prefersReducedMotion = false;
    render(<MascotFooterDivider />);
    expect(mocks.starAnimates.length).toBeGreaterThan(0);
    for (const a of mocks.starAnimates) {
      const opacity = (a as { opacity: unknown }).opacity;
      expect(Array.isArray(opacity)).toBe(true);
    }
  });

  it("fireflies drift (cx and cy are arrays)", () => {
    mocks.prefersReducedMotion = false;
    render(<MascotFooterDivider />);
    expect(mocks.fireflyAnimates.length).toBeGreaterThan(0);
    for (const a of mocks.fireflyAnimates) {
      const { cx, cy } = a as { cx: unknown; cy: unknown };
      expect(Array.isArray(cx)).toBe(true);
      expect(Array.isArray(cy)).toBe(true);
    }
  });
});

describe("MascotFooterDivider — reduced motion", () => {
  it("bear animation is undefined when useReducedMotion returns true", () => {
    mocks.prefersReducedMotion = true;
    render(<MascotFooterDivider />);
    expect(mocks.bearAnimate).toBeUndefined();
  });

  it("paw wave is undefined when useReducedMotion returns true", () => {
    mocks.prefersReducedMotion = true;
    render(<MascotFooterDivider />);
    expect(mocks.pawAnimate).toBeUndefined();
  });

  it("stars hold a static opacity (no array)", () => {
    mocks.prefersReducedMotion = true;
    render(<MascotFooterDivider />);
    expect(mocks.starAnimates.length).toBeGreaterThan(0);
    for (const a of mocks.starAnimates) {
      const opacity = (a as { opacity: unknown }).opacity;
      expect(Array.isArray(opacity)).toBe(false);
      expect(typeof opacity).toBe("number");
    }
  });

  it("fireflies hold a static position (cx and cy are scalars)", () => {
    mocks.prefersReducedMotion = true;
    render(<MascotFooterDivider />);
    expect(mocks.fireflyAnimates.length).toBeGreaterThan(0);
    for (const a of mocks.fireflyAnimates) {
      const { cx, cy } = a as { cx: unknown; cy: unknown };
      expect(Array.isArray(cx)).toBe(false);
      expect(Array.isArray(cy)).toBe(false);
      expect(typeof cx).toBe("number");
      expect(typeof cy).toBe("number");
    }
  });
});

describe("MascotFooterDivider — null reduced-motion (SSR/unknown)", () => {
  it("defaults to animating (matches Footer.tsx behavior)", () => {
    mocks.prefersReducedMotion = null;
    render(<MascotFooterDivider />);
    expect(mocks.bearAnimate).toEqual({ scaleY: [1, 1.045, 1] });
  });
});
