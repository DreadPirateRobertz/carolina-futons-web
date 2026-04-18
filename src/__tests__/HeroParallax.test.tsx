import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Stub framer-motion so jsdom doesn't need a real scroll environment.
// Capture useScroll/useTransform so tests can assert they were wired.
const motionMocks = vi.hoisted(() => ({
  useReducedMotion: vi.fn(() => false),
  useScroll: vi.fn(() => ({ scrollYProgress: { get: () => 0 } })),
  useTransform: vi.fn((_mv: unknown, _input: unknown, _output: number[]) => ({
    get: () => _output[0],
  })),
}));

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    useReducedMotion: motionMocks.useReducedMotion,
    useScroll: motionMocks.useScroll,
    useTransform: motionMocks.useTransform,
    m: {
      ...actual.m,
      div: ({ children, style, ...rest }: React.HTMLAttributes<HTMLDivElement> & { style?: object }) => (
        <div data-testid="motion-div" data-has-style={style ? "true" : "false"} {...rest}>
          {children}
        </div>
      ),
    },
  };
});

import { HeroParallax } from "@/components/site/HeroParallax";

beforeEach(() => {
  motionMocks.useReducedMotion.mockReturnValue(false);
  motionMocks.useScroll.mockReturnValue({ scrollYProgress: { get: () => 0 } });
  motionMocks.useTransform.mockClear();
});

describe("HeroParallax", () => {
  it("renders children without crashing", () => {
    render(
      <HeroParallax>
        <div role="region" aria-label="Hero image carousel">carousel content</div>
      </HeroParallax>,
    );
    expect(screen.getByRole("region", { name: /hero image carousel/i })).toBeTruthy();
  });

  it("preserves the aria-label of the wrapped carousel", () => {
    render(
      <HeroParallax>
        <div role="region" aria-label="Hero image carousel">slides</div>
      </HeroParallax>,
    );
    expect(
      screen.getByRole("region", { name: "Hero image carousel" }),
    ).toBeInTheDocument();
  });

  it("wires useScroll to track the container ref", () => {
    render(<HeroParallax><div>content</div></HeroParallax>);
    expect(motionMocks.useScroll).toHaveBeenCalledWith(
      expect.objectContaining({ target: expect.objectContaining({ current: expect.anything() }) }),
    );
  });

  it("passes y transform to motion div when reduced-motion is off", () => {
    motionMocks.useReducedMotion.mockReturnValue(false);
    render(<HeroParallax><div>content</div></HeroParallax>);
    const div = screen.getByTestId("motion-div");
    expect(div.getAttribute("data-has-style")).toBe("true");
  });

  it("omits y transform when prefers-reduced-motion is set", () => {
    motionMocks.useReducedMotion.mockReturnValue(true);
    render(<HeroParallax><div>content</div></HeroParallax>);
    const div = screen.getByTestId("motion-div");
    expect(div.getAttribute("data-has-style")).toBe("false");
  });
});
