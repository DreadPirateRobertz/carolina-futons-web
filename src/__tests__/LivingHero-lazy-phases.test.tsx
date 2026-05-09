import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";

// cf-byms: pin the lazy-mount contract for LivingHero. Initial render mounts
// only the active phase — the three other phase SVGs appear after the first
// requestIdleCallback fires. Without this guard, all four phases mount on
// first paint (the pre-cf-byms behavior) and Home LCP regresses.

// Force the time-of-day hook into a known phase for assertions.
let mockedPhase: "night" | "dawn" | "day" | "dusk" = "day";
const mockedHookReturn = {
  get phase() {
    return mockedPhase;
  },
  time: 0,
  mounted: true,
  reduceMotion: false,
};
vi.mock("@/lib/hooks/useTimeOfDay", () => ({
  useTimeOfDay: () => mockedHookReturn,
}));

// Stub the four phase components with identifiable testids so we can assert
// presence/absence per render pass without rendering the heavy SVGs.
vi.mock("@/components/mascot/MascotWorldHero", () => ({
  MascotWorldHero: () => <div data-testid="phase-day" />,
}));
vi.mock("@/components/mascot/VintageSunRays", () => ({
  VintageSunRays: ({ phase }: { phase: string }) => (
    <div data-testid={`phase-${phase}`} />
  ),
}));
vi.mock("@/components/mascot/StargazingHero", () => ({
  StargazingHero: () => <div data-testid="phase-night" />,
}));

import { LivingHero } from "@/components/home/LivingHero";

describe("LivingHero — lazy-mount inactive phases (cf-byms)", () => {
  beforeEach(() => {
    mockedPhase = "day";
    // Stub requestIdleCallback so we can drive when the inactive phases
    // mount. setTimeout fallback is the same shape so test on jsdom which
    // doesn't ship requestIdleCallback natively.
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("on first render, mounts only the active phase", () => {
    mockedPhase = "day";
    render(<LivingHero />);
    expect(screen.getByTestId("phase-day")).toBeInTheDocument();
    expect(screen.queryByTestId("phase-night")).toBeNull();
    expect(screen.queryByTestId("phase-dawn")).toBeNull();
    expect(screen.queryByTestId("phase-dusk")).toBeNull();
  });

  it.each(["night", "dawn", "day", "dusk"] as const)(
    "respects the active phase (%s) — mounts that one and skips the others",
    (phase) => {
      mockedPhase = phase;
      render(<LivingHero />);
      expect(screen.getByTestId(`phase-${phase}`)).toBeInTheDocument();
      const others = (["night", "dawn", "day", "dusk"] as const).filter(
        (p) => p !== phase,
      );
      for (const other of others) {
        expect(screen.queryByTestId(`phase-${other}`)).toBeNull();
      }
    },
  );

  it("after the idle callback fires, mounts the three inactive phases too (cross-fade ready)", async () => {
    mockedPhase = "day";
    render(<LivingHero />);
    // Pre-idle: only active phase mounted.
    expect(screen.queryByTestId("phase-night")).toBeNull();

    // Drive the idle callback via the setTimeout fallback (jsdom path).
    await act(async () => {
      vi.runAllTimers();
    });

    // Post-idle: all four phases present in the DOM.
    expect(screen.getByTestId("phase-day")).toBeInTheDocument();
    expect(screen.getByTestId("phase-night")).toBeInTheDocument();
    expect(screen.getByTestId("phase-dawn")).toBeInTheDocument();
    expect(screen.getByTestId("phase-dusk")).toBeInTheDocument();
  });

  it("aria-label reflects the active phase", () => {
    mockedPhase = "night";
    const { rerender } = render(<LivingHero />);
    const root = document.querySelector('[data-slot="living-hero"]');
    expect(root?.getAttribute("aria-label")).toMatch(/stargazing/i);

    mockedPhase = "day";
    rerender(<LivingHero />);
    const rootDay = document.querySelector('[data-slot="living-hero"]');
    expect(rootDay?.getAttribute("aria-label")).toMatch(/blue ridge/i);
  });
});
