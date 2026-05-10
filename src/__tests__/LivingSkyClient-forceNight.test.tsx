// cf-96m8 — forceNight (footer always-night backdrop) wins over wall clock,
// theme, and reduced-motion. Asserts the call sites that prove it.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";

vi.mock("@/lib/illustrations/living-sky-svg", () => ({
  LIVING_SKY_SVG_BODY: `<svg><circle id="stars" opacity="0"/></svg>`,
}));

const { mockComputeLivingSky } = vi.hoisted(() => {
  const mockComputeLivingSky = vi.fn((_mins: number) => ({
    skyColors: ["#000", "#000", "#000", "#000"] as [
      string,
      string,
      string,
      string,
    ],
    glowColors: ["transparent", "transparent"] as [string, string],
    ridgeColors: { r1: "#000", r2: "#000", r3: "#000", r4: "#000", tree: "#000" },
    sunPos: { cx: 0, cy: 0, r: 0, opacity: 0 },
    moonPos: {
      cx: 0,
      cy: 0,
      opacity: 1,
      phase: 0,
      shadowOffset: { dx: 0, dy: 0 },
    },
    starOpacity: 0.9,
    cloudOpacity: 0,
    birdOpacity: 0,
    fireflyOpacity: 0.55,
    owlOpacity: 0.9,
    rimOpacity: 0,
    rimColor: "#000",
    navBg: "#000",
    navText: "#fff",
    season: "summer" as const,
    precipitationOpacity: 0,
    precipitationType: "none" as const,
    weatherLabel: "",
    animationHint: null,
  }));
  return { mockComputeLivingSky };
});

vi.mock("@/lib/illustrations/living-sky", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/illustrations/living-sky")>();
  return { ...actual, computeLivingSky: mockComputeLivingSky };
});

import { LivingSkyClient } from "@/components/illustrations/LivingSkyClient";
import { MIDNIGHT_MINUTES } from "@/lib/illustrations/living-sky";

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  document.documentElement.classList.remove("dark");
  mockComputeLivingSky.mockClear();
});

afterEach(() => {
  document.documentElement.classList.remove("dark");
  vi.restoreAllMocks();
});

describe("LivingSkyClient — forceNight (cf-96m8)", () => {
  it("calls computeLivingSky with MIDNIGHT_MINUTES on mount when forceNight", async () => {
    await act(async () => {
      render(<LivingSkyClient forceNight />);
    });
    expect(mockComputeLivingSky).toHaveBeenCalledWith(MIDNIGHT_MINUTES);
  });

  it("renders the data-slot wrapper regardless of forceNight", async () => {
    const { container } = await act(async () => {
      return render(<LivingSkyClient forceNight />);
    });
    expect(
      container.querySelector('[data-slot="living-sky-svg"]'),
    ).not.toBeNull();
  });

  it("ignores the dark class — forceNight stays night even in light mode", async () => {
    // Light mode + forceNight should still pin to midnight (the dark class
    // is only relevant for the cycling header instance).
    document.documentElement.classList.remove("dark");
    await act(async () => {
      render(<LivingSkyClient forceNight />);
    });
    const calls = mockComputeLivingSky.mock.calls.map(([m]) => m);
    expect(calls).toContain(MIDNIGHT_MINUTES);
    // Critically: never called with the wall-clock value (which would be
    // anything other than MIDNIGHT_MINUTES).
    expect(calls.every((m) => m === MIDNIGHT_MINUTES)).toBe(true);
  });

  it("does not start the 60s tick interval when forceNight", async () => {
    vi.useFakeTimers();
    await act(async () => {
      render(<LivingSkyClient forceNight />);
    });
    mockComputeLivingSky.mockClear();
    // Advance past the 60s tick — no extra computeLivingSky call should fire.
    await act(async () => {
      vi.advanceTimersByTime(120_000);
    });
    expect(mockComputeLivingSky).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
