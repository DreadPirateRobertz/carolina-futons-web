import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("framer-motion", () => ({ useReducedMotion: vi.fn(() => false) }));

import { VintageSunRays } from "@/components/mascot/VintageSunRays";

describe("VintageSunRays", () => {
  it("renders 24 rays for dawn phase", () => {
    const { container } = render(<VintageSunRays phase="dawn" time={0} />);
    const rays = container.querySelectorAll("polygon[fill='#FAF0D0']");
    expect(rays.length).toBe(24);
  });

  it("renders 24 rays for dusk phase", () => {
    const { container } = render(<VintageSunRays phase="dusk" time={0} />);
    const rays = container.querySelectorAll("polygon[fill='#FAF0C0']");
    expect(rays.length).toBe(24);
  });

  it("all ray opacity values are deterministic integers when time is 0", () => {
    // When time===0 there must be no Math.sin call in the opacity calc —
    // the SSR/browser Math.sin precision difference on 8.4 rad (i=21)
    // caused a hydration mismatch. With pulse=1 at time=0, opacity is a
    // clean 0.28 or 0.18 with no floating-point variance.
    const { container } = render(<VintageSunRays phase="dawn" time={0} />);
    const rays = container.querySelectorAll("polygon[fill='#FAF0D0']");
    rays.forEach((ray, i) => {
      const op = parseFloat(ray.getAttribute("opacity") ?? "");
      const base = i % 2 === 0 ? 0.28 : 0.18;
      expect(op).toBe(base);
    });
  });

  it("ray opacity differs from base when time is positive (pulse active)", () => {
    const { container } = render(<VintageSunRays phase="dawn" time={1} />);
    const rays = container.querySelectorAll("polygon[fill='#FAF0D0']");
    // At least some odd rays should deviate from 0.18 due to pulse
    const oddOps = Array.from(rays)
      .filter((_, i) => i % 2 !== 0)
      .map((r) => parseFloat(r.getAttribute("opacity") ?? ""));
    const allBase = oddOps.every((op) => op === 0.18);
    expect(allBase).toBe(false);
  });
});
