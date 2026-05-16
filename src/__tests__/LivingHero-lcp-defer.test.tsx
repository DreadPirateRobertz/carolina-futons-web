// cfw-qz7 (cfw-vxb deferred suspect #1): LivingHero opacity-fade-in is the
// home LCP killer. The pre-fix wrapper sets `opacity: !mounted ? 0 : ...`
// which paints the active phase at opacity 0 during SSR + the first client
// frame. Browsers do not measure LCP on opacity:0 elements, so Lighthouse
// sees no LCP from the hero and either picks a smaller-but-visible element
// (inflating LCP) or misses the candidate entirely.
//
// Fix: drop the `!mounted ?` gate so the active phase paints at full
// opacity on SSR + first client frame. The CSS transition kicks in only
// after `mounted` flips true (preserved verbatim), so phase boundaries
// hours later still cross-fade smoothly.
//
// These tests pin the contract via the inline `style.opacity` value the
// wrapper actually emits — assertion is byte-equal to what the browser
// computes, which is what Lighthouse / a screenshot test would observe.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock useTimeOfDay so we can control `mounted` state per test.
let mockedMounted = false;
let mockedPhase: "night" | "dawn" | "day" | "dusk" = "day";
vi.mock("@/lib/hooks/useTimeOfDay", () => ({
  useTimeOfDay: () => ({
    phase: mockedPhase,
    time: 0,
    mounted: mockedMounted,
    reduceMotion: false,
  }),
}));

// Stub the phase components with identifiable testids — we only inspect
// the wrapper's inline style.
vi.mock("@/components/mascot/MascotWorldHero", () => ({
  MascotWorldHero: () => <div data-testid="phase-day-child" />,
}));
vi.mock("@/components/mascot/VintageSunRays", () => ({
  VintageSunRays: ({ phase }: { phase: string }) => (
    <div data-testid={`phase-${phase}-child`} />
  ),
}));
vi.mock("@/components/mascot/StargazingHero", () => ({
  StargazingHero: () => <div data-testid="phase-night-child" />,
}));

import { LivingHero } from "@/components/home/LivingHero";

describe("cfw-qz7 — LivingHero LCP defer (active phase paints at opacity 1 on SSR)", () => {
  it("paints the active phase at opacity 1 even when mounted=false (SSR + first paint)", () => {
    mockedMounted = false;
    mockedPhase = "day";
    render(<LivingHero />);
    // The active phase ("day") child is wrapped in a Phase <div> whose
    // inline style sets the opacity. Inspect the parent of the testid.
    const child = screen.getByTestId("phase-day-child");
    const wrapper = child.parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper!.style.opacity).toBe("1");
  });

  it("does NOT apply a CSS transition before mounted=true (first paint snaps to final opacity)", () => {
    mockedMounted = false;
    mockedPhase = "day";
    render(<LivingHero />);
    const wrapper = screen.getByTestId("phase-day-child").parentElement;
    // No transition pre-mount: if a transition were active during the
    // first paint, the active phase would animate from undefined → 1
    // and Lighthouse might still measure mid-transition opacity.
    expect(wrapper!.style.transition).toBe("none");
  });

  it("still paints the active phase at opacity 1 after mounted=true", () => {
    mockedMounted = true;
    mockedPhase = "day";
    render(<LivingHero />);
    const wrapper = screen.getByTestId("phase-day-child").parentElement;
    expect(wrapper!.style.opacity).toBe("1");
  });

  it("applies the 4s cross-fade transition once mounted=true (phase-boundary cross-fade preserved)", () => {
    mockedMounted = true;
    mockedPhase = "day";
    render(<LivingHero />);
    const wrapper = screen.getByTestId("phase-day-child").parentElement;
    expect(wrapper!.style.transition).toBe("opacity 4s ease-in-out");
  });

  it("inactive phases stay at opacity 0 (does not regress cross-fade target state)", () => {
    mockedMounted = true;
    mockedPhase = "day";
    render(<LivingHero />);
    // With mountInactive false and only the active phase mounted on first
    // render, the other testids should NOT be present. After
    // requestIdleCallback fires (covered by LivingHero-lazy-phases test),
    // they mount with opacity 0. We're only asserting the first-render
    // active-only invariant here.
    expect(screen.queryByTestId("phase-night-child")).toBeNull();
    expect(screen.queryByTestId("phase-dawn-child")).toBeNull();
    expect(screen.queryByTestId("phase-dusk-child")).toBeNull();
  });
});
