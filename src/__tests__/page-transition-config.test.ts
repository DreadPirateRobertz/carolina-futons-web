import { describe, it, expect } from "vitest";

import { getPageTransitionVariants } from "@/lib/motion/page-transition-config";

describe("getPageTransitionVariants — default motion", () => {
  const v = getPageTransitionVariants({ reducedMotion: false });

  it("exits and enters with opacity from 0 → 1", () => {
    expect(v.initial.opacity).toBe(0);
    expect(v.animate.opacity).toBe(1);
    expect(v.exit.opacity).toBe(0);
  });

  it("slides in with an 8px y-offset", () => {
    expect(v.initial.y).toBe(8);
    expect(v.animate.y).toBe(0);
    expect(v.exit.y).toBe(-8);
  });

  it("runs at 200ms (0.2s) per Phase 7 motion budget", () => {
    expect(v.transition.duration).toBe(0.2);
  });

  it("uses an ease-out curve for perceived snappiness", () => {
    // Don't over-assert the shape — just confirm we're not on linear.
    expect(v.transition.ease).toBeDefined();
    expect(v.transition.ease).not.toBe("linear");
  });
});

describe("getPageTransitionVariants — reduced motion", () => {
  const v = getPageTransitionVariants({ reducedMotion: true });

  it("still fades opacity 0 → 1 so the route change is perceptible", () => {
    expect(v.initial.opacity).toBe(0);
    expect(v.animate.opacity).toBe(1);
    expect(v.exit.opacity).toBe(0);
  });

  it("drops the y-offset so nothing slides under reduced-motion", () => {
    expect(v.initial.y).toBe(0);
    expect(v.animate.y).toBe(0);
    expect(v.exit.y).toBe(0);
  });

  it("shortens the duration to a near-instant cross-fade", () => {
    // Respect OS-level reduced-motion: ≤ 100ms so it reads as instant.
    expect(v.transition.duration).toBeLessThanOrEqual(0.1);
  });
});
