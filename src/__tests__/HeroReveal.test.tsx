import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import { HeroReveal } from "@/components/motion/HeroReveal";
import { MotionProvider } from "@/components/motion/MotionProvider";

// Capture props passed to m.div / MotionConfig + control useReducedMotion so
// we can assert the WCAG 2.3.3 contract directly. The per-component gate
// (cf-3qt.7.M.FIX.2) means HeroReveal itself reads the user's preference —
// literal initial/whileInView objects aren't auto-honored by MotionConfig
// reducedMotion="user", so the component has to take the reduce path itself.
type CapturedDivProps = {
  initial?: { opacity?: number; y?: number };
  whileInView?: { opacity?: number; y?: number };
  viewport?: { once?: boolean; amount?: number };
  transition?: { duration?: number; delay?: number; ease?: string };
  "data-reduced-motion"?: string;
};

const motionMocks = vi.hoisted(() => ({
  divCalls: [] as CapturedDivProps[],
  motionConfigCalls: [] as Array<{ reducedMotion?: string }>,
  reduce: false,
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
  useReducedMotion: () => motionMocks.reduce,
  m: {
    div: ({
      children,
      initial,
      whileInView,
      viewport,
      transition,
      ...rest
    }: CapturedDivProps & { children?: ReactNode }) => {
      motionMocks.divCalls.push({
        initial,
        whileInView,
        viewport,
        transition,
        "data-reduced-motion": (rest as Record<string, string>)["data-reduced-motion"],
      });
      return <div data-testid="hero-reveal">{children}</div>;
    },
    span: ({
      children,
      initial,
      whileInView,
      viewport,
      transition,
      ...rest
    }: CapturedDivProps & { children?: ReactNode }) => {
      motionMocks.divCalls.push({
        initial,
        whileInView,
        viewport,
        transition,
        "data-reduced-motion": (rest as Record<string, string>)["data-reduced-motion"],
      });
      return <span data-testid="hero-reveal">{children}</span>;
    },
    li: ({
      children,
      initial,
      whileInView,
      viewport,
      transition,
      ...rest
    }: CapturedDivProps & { children?: ReactNode }) => {
      motionMocks.divCalls.push({
        initial,
        whileInView,
        viewport,
        transition,
        "data-reduced-motion": (rest as Record<string, string>)["data-reduced-motion"],
      });
      return <li data-testid="hero-reveal">{children}</li>;
    },
  },
}));

beforeEach(() => {
  motionMocks.divCalls = [];
  motionMocks.motionConfigCalls = [];
  motionMocks.reduce = false;
});

describe("HeroReveal — motion path (prefers-reduced-motion: no-preference)", () => {
  it("renders an m.div whose `initial` is the no-motion fallback (opacity 0, y 20)", () => {
    render(<HeroReveal>headline</HeroReveal>);
    expect(motionMocks.divCalls[0].initial).toEqual({ opacity: 0, y: 20 });
    expect(screen.getByTestId("hero-reveal").textContent).toBe("headline");
  });

  it("renders an m.div whose `whileInView` target is the visible state (opacity 1, y 0)", () => {
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

  it("passes once=false to viewport when once prop is false (scroll-out support)", () => {
    render(<HeroReveal once={false}>headline</HeroReveal>);
    expect(motionMocks.divCalls[0].viewport).toMatchObject({ once: false });
  });
});

describe("HeroReveal — reduced-motion path (cf-3qt.7.M.FIX.2)", () => {
  it("drops initial/whileInView/transition entirely when useReducedMotion reports true (WCAG 2.3.3)", () => {
    // With the per-component gate in place, reduce=true users get a plain
    // m.div with NO motion props — not a zeroed-transform render. This keeps
    // the subscription overhead off their critical path and guarantees no
    // stray transform ever reaches the DOM.
    motionMocks.reduce = true;
    render(<HeroReveal>headline</HeroReveal>);
    expect(motionMocks.divCalls[0].initial).toBeUndefined();
    expect(motionMocks.divCalls[0].whileInView).toBeUndefined();
    expect(motionMocks.divCalls[0].transition).toBeUndefined();
    expect(motionMocks.divCalls[0].viewport).toBeUndefined();
  });

  it("still renders the children in the reduced-motion path", () => {
    // A common regression: a too-aggressive gate would also unmount the
    // child text. Reading the hero on reduce users must still work.
    motionMocks.reduce = true;
    render(<HeroReveal>headline copy</HeroReveal>);
    expect(screen.getByTestId("hero-reveal").textContent).toBe("headline copy");
  });

  it("marks the reduced-motion render with data-reduced-motion='1' for regression lockup", () => {
    // The attribute gives Playwright / Lighthouse assertions a direct hook
    // to verify the gate fired without having to inspect motion props.
    motionMocks.reduce = true;
    render(<HeroReveal>headline</HeroReveal>);
    expect(motionMocks.divCalls[0]["data-reduced-motion"]).toBe("1");
  });
});

describe("MotionProvider — WCAG 2.3.3 enforcement", () => {
  it("wraps children in MotionConfig with reducedMotion='user'", () => {
    // The root MotionConfig is belt: framer's variants-API auto-honor. The
    // suspenders are the per-component gates (HeroReveal above, PageTransition,
    // PdpGallery/ZoomMainImage). Together they cover both the variants and
    // literal-object paths.
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
