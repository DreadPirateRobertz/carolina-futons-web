import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Stub framer-motion so jsdom doesn't need a real scroll environment.
// Capture useScroll/useTransform so tests can assert they were wired.
const motionMocks = vi.hoisted(() => ({
  useReducedMotion: vi.fn(() => false),
  useScroll: vi.fn(() => ({ scrollYProgress: { get: () => 0 } })),
  useTransform: vi.fn((_mv: unknown, _input: unknown, output: number[]) => ({
    get: () => output[0],
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
        <span data-testid="child">content</span>
      </HeroParallax>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("preserves the aria-label of the wrapped carousel region", () => {
    render(
      <HeroParallax>
        <div role="region" aria-label="Hero image carousel">slides</div>
      </HeroParallax>,
    );
    expect(
      screen.getByRole("region", { name: "Hero image carousel" }),
    ).toBeInTheDocument();
  });

  it("wires useScroll to container ref with correct viewport offset", () => {
    render(<HeroParallax><div>content</div></HeroParallax>);
    expect(motionMocks.useScroll).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ current: expect.anything() }),
        offset: ["start start", "end start"],
      }),
    );
  });

  it("calls useTransform with [0,1] → [0,-50] range", () => {
    render(<HeroParallax><div>content</div></HeroParallax>);
    expect(motionMocks.useTransform).toHaveBeenCalledWith(
      expect.anything(),
      [0, 1],
      [0, -50],
    );
  });

  it("passes style with y key to motion div when reduced-motion is off", () => {
    motionMocks.useReducedMotion.mockReturnValue(false);
    const { container } = render(<HeroParallax><div>content</div></HeroParallax>);
    const div = container.querySelector("[data-testid='motion-div']");
    expect(div?.getAttribute("data-has-style")).toBe("true");
  });

  it("omits style entirely when prefers-reduced-motion is set", () => {
    motionMocks.useReducedMotion.mockReturnValue(true);
    const { container } = render(<HeroParallax><div>content</div></HeroParallax>);
    const div = container.querySelector("[data-testid='motion-div']");
    expect(div?.getAttribute("data-has-style")).toBe("false");
  });

  it("treats SSR null from useReducedMotion as non-reduced (no style omission)", () => {
    motionMocks.useReducedMotion.mockReturnValue(null as unknown as boolean);
    const { container } = render(<HeroParallax><div>content</div></HeroParallax>);
    const div = container.querySelector("[data-testid='motion-div']");
    expect(div?.getAttribute("data-has-style")).toBe("true");
  });
});
