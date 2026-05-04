import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";

// Mock the SVG body so the test doesn't need the full ~15 KB constant.
vi.mock("@/lib/illustrations/living-sky-svg", () => ({
  LIVING_SKY_SVG_BODY: `<svg><circle id="stars" opacity="0"/><circle id="sun-disc" cx="0" cy="0" r="0" opacity="0"/></svg>`,
}));

// Use vi.hoisted so the mock factory can reference the fn before hoisting.
const { mockComputeLivingSky } = vi.hoisted(() => {
  const mockComputeLivingSky = vi.fn((mins: number) => ({
    skyColors: ["#000", "#000", "#000", "#000"] as [string,string,string,string],
    glowColors: ["transparent", "transparent"] as [string,string],
    ridgeColors: { r1: "#000", r2: "#000", r3: "#000", r4: "#000", tree: "#000" },
    sunPos: { cx: 0, cy: 0, r: 0, opacity: 0 },
    moonPos: { cx: 0, cy: 0, opacity: mins === 0 ? 1 : 0, phase: 0, shadowOffset: { dx: 0, dy: 0 } },
    starOpacity: mins === 0 ? 0.9 : 0,
    cloudOpacity: 0, birdOpacity: 0, fireflyOpacity: mins === 0 ? 0.55 : 0,
    owlOpacity: mins === 0 ? 0.9 : 0, rimOpacity: 0, rimColor: "#000",
    navBg: "#000", navText: "#fff", season: "summer" as const,
    precipitationOpacity: 0, precipitationType: "none" as const,
    weatherLabel: "", animationHint: null,
  }));
  return { mockComputeLivingSky };
});

vi.mock("@/lib/illustrations/living-sky", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/illustrations/living-sky")>();
  return {
    ...actual,
    computeLivingSky: mockComputeLivingSky,
  };
});

import { LivingSkyClient } from "@/components/illustrations/LivingSkyClient";
import { MIDNIGHT_MINUTES, NOON_MINUTES } from "@/lib/illustrations/living-sky";

// Stub matchMedia (reduced-motion = false by default).
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

describe("LivingSkyClient — dark mode (cf-wzl3)", () => {
  it("uses clock time (not MIDNIGHT_MINUTES) when dark mode is off", async () => {
    await act(async () => { render(<LivingSkyClient />); });
    const callArgs = mockComputeLivingSky.mock.calls.map((c) => c[0]);
    // In light mode, should NOT be called with MIDNIGHT_MINUTES
    expect(callArgs.every((a) => a !== MIDNIGHT_MINUTES)).toBe(true);
  });

  it("calls computeLivingSky with MIDNIGHT_MINUTES when dark mode is active on mount", async () => {
    document.documentElement.classList.add("dark");
    await act(async () => { render(<LivingSkyClient />); });
    expect(mockComputeLivingSky).toHaveBeenCalledWith(MIDNIGHT_MINUTES);
  });

  it("switches to MIDNIGHT_MINUTES when dark class is added after mount", async () => {
    await act(async () => { render(<LivingSkyClient />); });
    mockComputeLivingSky.mockClear();

    await act(async () => {
      document.documentElement.classList.add("dark");
      // Allow MutationObserver callback + React state update to settle
      await Promise.resolve();
    });

    expect(mockComputeLivingSky).toHaveBeenCalledWith(MIDNIGHT_MINUTES);
  });

  it("switches away from MIDNIGHT_MINUTES when dark class is removed", async () => {
    document.documentElement.classList.add("dark");
    await act(async () => { render(<LivingSkyClient />); });
    mockComputeLivingSky.mockClear();

    await act(async () => {
      document.documentElement.classList.remove("dark");
      await Promise.resolve();
    });

    // After removing dark, should NOT call with MIDNIGHT_MINUTES
    const callArgs = mockComputeLivingSky.mock.calls.map((c) => c[0]);
    expect(callArgs.every((a) => a !== MIDNIGHT_MINUTES)).toBe(true);
  });

  it("reduced-motion takes precedence over dark mode (uses NOON_MINUTES)", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    document.documentElement.classList.add("dark");
    await act(async () => { render(<LivingSkyClient />); });
    expect(mockComputeLivingSky).toHaveBeenCalledWith(NOON_MINUTES);
    expect(mockComputeLivingSky).not.toHaveBeenCalledWith(MIDNIGHT_MINUTES);
  });
});
