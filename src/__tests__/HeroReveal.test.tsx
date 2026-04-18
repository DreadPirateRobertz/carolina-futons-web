import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import { HeroReveal } from "@/components/motion/HeroReveal";
import { MotionProvider } from "@/components/motion/MotionProvider";

// Capture the props passed to m.div / MotionConfig so we can assert the
// WCAG 2.3.3 contract directly: HeroReveal hands literal initial/whileInView
// to m.div, and MotionProvider's MotionConfig is what makes those literals
// reduced-motion-safe app-wide.
type CapturedDivProps = {
  initial?: { opacity?: number; y?: number };
  whileInView?: { opacity?: number; y?: number };
  viewport?: { once?: boolean; amount?: number };
  transition?: { duration?: number; delay?: number; ease?: string };
};

const motionMocks = vi.hoisted(() => ({
  divCalls: [] as CapturedDivProps[],
  motionConfigCalls: [] as Array<{ reducedMotion?: string }>,
}));

vi.mock("framer-motion", () => ({
  domAnimation: {},
  LazyMotion: ({ children }: { children: ReactNode }) => <>{children}</>,
  MotionConfig: ({
    reducedMotion,
    children,
  }: {
    reducedMotion?: string;
    children: ReactNode;
  }) => {
    motionMocks.motionConfigCalls.push({ reducedMotion });
    return <>{children}</>;
  },
  m: {
    div: ({
      children,
      initial,
      whileInView,
      viewport,
      transition,
    }: CapturedDivProps & { children?: ReactNode }) => {
      motionMocks.divCalls.push({ initial, whileInView, viewport, transition });
      return <div data-testid="hero-reveal">{children}</div>;
    },
  },
}));

beforeEach(() => {
  motionMocks.divCalls = [];
  motionMocks.motionConfigCalls = [];
});

describe("HeroReveal — reduced-motion contract (WCAG 2.3.3)", () => {
  it("renders an m.div whose `initial` is the no-motion fallback (opacity 0, y 20)", () => {
    // The reduce=true effective state: framer (with MotionConfig
    // reducedMotion='user') skips the y transform and snaps to the animate
    // target. The `initial` prop here is what the user without motion
    // perception ends up perceiving as their reset/baseline.
    render(<HeroReveal>headline</HeroReveal>);
    expect(motionMocks.divCalls[0].initial).toEqual({ opacity: 0, y: 20 });
    expect(screen.getByTestId("hero-reveal").textContent).toBe("headline");
  });

  it("renders an m.div whose `whileInView` target is the visible state (opacity 1, y 0)", () => {
    // The reduce=false effective state: framer interpolates from initial
    // → whileInView when the element enters the viewport. The target must
    // be the fully-visible state so reduced-motion users (who skip the
    // interpolation) still land at the readable end-state.
    render(<HeroReveal>headline</HeroReveal>);
    expect(motionMocks.divCalls[0].whileInView).toEqual({ opacity: 1, y: 0 });
  });

  it("forwards the delay through to the transition prop", () => {
    render(<HeroReveal delay={0.15}>subhead</HeroReveal>);
    expect(motionMocks.divCalls[0].transition).toMatchObject({
      duration: 0.6,
      delay: 0.15,
      ease: "easeOut",
    });
  });

  it("uses viewport once: true so the reveal does not replay on scroll-back", () => {
    render(<HeroReveal>headline</HeroReveal>);
    expect(motionMocks.divCalls[0].viewport).toMatchObject({ once: true });
  });
});

describe("MotionProvider — WCAG 2.3.3 enforcement", () => {
  it("wraps children in MotionConfig with reducedMotion='user'", () => {
    // This is the load-bearing assertion for the fix: MotionConfig at the
    // root is what makes literal `initial`/`whileInView`/`animate` props
    // (the ones HeroReveal et al. use) honor prefers-reduced-motion. Without
    // it, framer's auto-honor only fires for the *variants* API.
    render(
      <MotionProvider>
        <div data-testid="provider-child" />
      </MotionProvider>,
    );
    expect(motionMocks.motionConfigCalls).toHaveLength(1);
    expect(motionMocks.motionConfigCalls[0].reducedMotion).toBe("user");
    expect(screen.getByTestId("provider-child")).toBeInTheDocument();
  });
});
