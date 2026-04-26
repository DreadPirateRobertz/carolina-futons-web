import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// cf-j11o: hero headline staggered word animation. Each word in the h1 is
// wrapped in its own HeroReveal span with a cascading delay. Reduced motion
// is handled per-component via useReducedMotion() — the oscillateWeight path
// skips the m.span entirely when reduce is true.

type Captured = {
  delay?: number;
  text: string;
  once?: boolean;
};

const mocks = vi.hoisted(() => ({
  calls: [] as Captured[],
  weightSpans: [] as { animate: unknown; transition: unknown }[],
  reducedMotion: false as boolean | null,
}));

vi.mock("@/components/motion/HeroReveal", () => ({
  HeroReveal: ({
    children,
    delay,
    as,
    once,
  }: {
    children: ReactNode;
    delay?: number;
    as?: "div" | "span" | "li";
    once?: boolean;
  }) => {
    // Assert the caller always requests an inline reveal — div-in-h1 would
    // break inline word flow and invalidate the h1's phrasing content.
    if (as !== "span") {
      throw new Error(`HeroWordStagger must request as='span', got ${String(as)}`);
    }
    mocks.calls.push({ delay, text: String(children), once });
    return <span data-testid="word-span">{children}</span>;
  },
}));

vi.mock("framer-motion", () => ({
  m: {
    span: ({
      children,
      animate,
      transition,
      className,
    }: {
      children: ReactNode;
      animate?: unknown;
      transition?: unknown;
      className?: string;
    }) => {
      mocks.weightSpans.push({ animate, transition });
      return (
        <span data-testid="weight-span" className={className}>
          {children}
        </span>
      );
    },
  },
  useReducedMotion: () => mocks.reducedMotion,
}));

beforeEach(() => {
  mocks.calls = [];
  mocks.weightSpans = [];
  mocks.reducedMotion = false;
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
    expect(container.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "Quality futons for your home",
    );
  });

  it("collapses consecutive whitespace so '&' and punctuation words render once", () => {
    render(<HeroWordStagger text="Quality futons &amp; furniture" />);
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
    expect(mocks.calls).toHaveLength(3);
  });
});

describe("HeroWordStagger — scrollOut prop", () => {
  it("passes once=true to every HeroReveal by default (fire-once behaviour)", () => {
    render(<HeroWordStagger text="one two three" />);
    for (const call of mocks.calls) {
      expect(call.once).toBe(true);
    }
  });

  it("passes once=false to every HeroReveal when scrollOut=true", () => {
    render(<HeroWordStagger text="one two three" scrollOut />);
    for (const call of mocks.calls) {
      expect(call.once).toBe(false);
    }
  });

  it("once=true when scrollOut=false (explicit false matches default)", () => {
    render(<HeroWordStagger text="one two" scrollOut={false} />);
    for (const call of mocks.calls) {
      expect(call.once).toBe(true);
    }
  });
});

describe("HeroWordStagger — oscillateWeight prop", () => {
  it("renders no weight-span by default", () => {
    render(<HeroWordStagger text="one two three" />);
    expect(screen.queryAllByTestId("weight-span")).toHaveLength(0);
  });

  it("renders one weight-span per word when oscillateWeight=true", () => {
    render(<HeroWordStagger text="one two three" oscillateWeight />);
    expect(screen.getAllByTestId("weight-span")).toHaveLength(3);
  });

  it("weight-span uses 300→900→600 fontVariationSettings keyframes", () => {
    render(<HeroWordStagger text="one two" oscillateWeight />);
    for (const span of mocks.weightSpans) {
      expect(span.animate).toEqual({
        fontVariationSettings: ['"wght" 300', '"wght" 900', '"wght" 600'],
      });
    }
  });

  it("stagger delay on weight-span leads the word delay by +0.3s", () => {
    render(<HeroWordStagger text="one two three" oscillateWeight />);
    mocks.weightSpans.forEach((span, i) => {
      const expected = i * WORD_STAGGER_STEP + 0.3;
      expect((span.transition as { delay: number }).delay).toBeCloseTo(expected, 5);
    });
  });

  it("skips weight-span when prefers-reduced-motion is true", () => {
    mocks.reducedMotion = true;
    render(<HeroWordStagger text="one two three" oscillateWeight />);
    expect(screen.queryAllByTestId("weight-span")).toHaveLength(0);
  });

  it("still renders all word-spans when oscillateWeight=true + reduced motion", () => {
    mocks.reducedMotion = true;
    render(<HeroWordStagger text="one two three" oscillateWeight />);
    expect(screen.getAllByTestId("word-span")).toHaveLength(3);
  });

  it("weight-span is inline-block (y-transform needs a box)", () => {
    render(<HeroWordStagger text="hello" oscillateWeight />);
    const span = screen.getByTestId("weight-span");
    expect(span.className).toContain("inline-block");
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
