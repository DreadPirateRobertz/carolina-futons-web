import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// cf-j11o: hero headline staggered word animation. Each word in the h1 is
// wrapped in its own HeroReveal span with a cascading delay. Reduced motion
// is handled app-wide by MotionProvider's MotionConfig reducedMotion="user"
// — the component doesn't need to branch on the media query itself.

type Captured = {
  delay?: number;
  text: string;
};

const mocks = vi.hoisted(() => ({
  calls: [] as Captured[],
}));

vi.mock("@/components/motion/HeroReveal", () => ({
  HeroReveal: ({
    children,
    delay,
    as,
  }: {
    children: ReactNode;
    delay?: number;
    as?: "div" | "span";
  }) => {
    // Assert the caller always requests an inline reveal — div-in-h1 would
    // break inline word flow and invalidate the h1's phrasing content.
    if (as !== "span") {
      throw new Error(`HeroWordStagger must request as='span', got ${String(as)}`);
    }
    mocks.calls.push({ delay, text: String(children) });
    return <span data-testid="word-span">{children}</span>;
  },
}));

beforeEach(() => {
  mocks.calls = [];
});

import { HeroWordStagger, WORD_STAGGER_STEP } from "@/components/motion/HeroWordStagger";

describe("HeroWordStagger — word splitting", () => {
  it("renders one span per word", () => {
    render(<HeroWordStagger text="Quality futons for your home" />);
    const spans = screen.getAllByTestId("word-span");
    expect(spans).toHaveLength(5);
  });

  it("preserves the full headline text (reading order + content)", () => {
    const { container } = render(
      <HeroWordStagger text="Quality futons for your home" />,
    );
    // Normalize whitespace — the component may insert separator characters
    // between spans. What matters for a11y + SEO is the reading order.
    expect(container.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "Quality futons for your home",
    );
  });

  it("collapses consecutive whitespace so '&' and punctuation words render once", () => {
    render(<HeroWordStagger text="Quality futons &amp; furniture" />);
    // The ampersand-entity is decoded by React to '&' before the component
    // sees the string. We split on whitespace, so '&' is its own word.
    const spans = screen.getAllByTestId("word-span");
    expect(spans).toHaveLength(4);
  });
});

describe("HeroWordStagger — cascading delays", () => {
  it("assigns delay = index * WORD_STAGGER_STEP in order", () => {
    render(<HeroWordStagger text="one two three four" />);
    const delays = mocks.calls.map((c) => c.delay);
    expect(delays).toEqual([
      0,
      WORD_STAGGER_STEP,
      WORD_STAGGER_STEP * 2,
      WORD_STAGGER_STEP * 3,
    ]);
  });

  it("first word has zero delay (no artificial wait on landing)", () => {
    render(<HeroWordStagger text="Quality futons for your home" />);
    expect(mocks.calls[0].delay).toBe(0);
  });

  it("step is 60ms = 0.06s (design-budget-sized onset difference)", () => {
    // 60ms is at the JND threshold for sequential onset — perceptible as
    // intentional ordering without feeling sluggish. 5 words × 60ms = 300ms
    // total cascade, inside the 500ms vestibular budget.
    expect(WORD_STAGGER_STEP).toBeCloseTo(0.06, 5);
  });

  it("accepts a custom step override", () => {
    render(<HeroWordStagger text="one two three" stepSeconds={0.1} />);
    expect(mocks.calls.map((c) => c.delay)).toEqual([0, 0.1, 0.2]);
  });
});

describe("HeroWordStagger — inline element contract", () => {
  it("requests as='span' on every HeroReveal (no div-in-h1)", () => {
    render(<HeroWordStagger text="one two three" />);
    // The mock throws on non-span; this test just pins the contract
    // explicitly so the throw path is exercised in CI.
    expect(mocks.calls).toHaveLength(3);
  });
});

describe("HeroWordStagger — edge cases", () => {
  it("renders nothing visible when text is an empty string", () => {
    render(<HeroWordStagger text="" />);
    expect(screen.queryAllByTestId("word-span")).toHaveLength(0);
  });

  it("treats a single-word headline as one span with zero delay", () => {
    render(<HeroWordStagger text="Hello" />);
    const spans = screen.getAllByTestId("word-span");
    expect(spans).toHaveLength(1);
    expect(mocks.calls[0].delay).toBe(0);
  });

  it("trims leading / trailing whitespace and does not emit empty spans", () => {
    render(<HeroWordStagger text="   padded   text   " />);
    const spans = screen.getAllByTestId("word-span");
    expect(spans).toHaveLength(2);
  });
});
