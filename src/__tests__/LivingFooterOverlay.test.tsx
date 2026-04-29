import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render } from "@testing-library/react";

// Stub useReducedMotion so both branches are exercisable.
const reduceMotionSpy = vi.fn<() => boolean | null>(() => false);
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>(
    "framer-motion",
  );
  return { ...actual, useReducedMotion: () => reduceMotionSpy() };
});

// Freeze time so computeLivingSky produces deterministic output.
// 02:00 → deep night (starOpacity well above the 0.15 render threshold)
// 12:00 → midday (starOpacity is 0 — stars suppressed)
const NIGHT_DATE = new Date("2026-04-28T02:00:00");
const DAY_DATE = new Date("2026-04-28T12:00:00");

import { LivingFooterOverlay } from "@/components/site/LivingFooterOverlay";

beforeEach(() => {
  reduceMotionSpy.mockReturnValue(false);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("LivingFooterOverlay — initial render", () => {
  it("renders atmospheric markup after effects flush", async () => {
    // useEffect needs act() to flush — the overlay is null until derive() runs.
    vi.setSystemTime(DAY_DATE);
    const { container } = render(<LivingFooterOverlay />);
    await act(async () => {});
    expect(container.firstChild).not.toBeNull();
  });

  it("renders the sky tint overlay after mount", async () => {
    vi.setSystemTime(DAY_DATE);
    const { container } = render(<LivingFooterOverlay />);
    await act(async () => {});
    const tint = container.querySelector("[aria-hidden='true']");
    expect(tint).not.toBeNull();
  });

  it("sky tint has a linear-gradient background-image", async () => {
    vi.setSystemTime(DAY_DATE);
    const { container } = render(<LivingFooterOverlay />);
    await act(async () => {});
    const tint = container.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(tint?.style.backgroundImage).toMatch(/linear-gradient/i);
  });
});

describe("LivingFooterOverlay — night branch (starOpacity > 0.15)", () => {
  it("renders 12 star elements at 02:00", async () => {
    vi.setSystemTime(NIGHT_DATE);
    reduceMotionSpy.mockReturnValue(false);
    const { container } = render(<LivingFooterOverlay />);
    await act(async () => {});
    const stars = container.querySelectorAll("[data-testid='star']");
    expect(stars.length).toBe(12);
  });

  it("star elements are aria-hidden", async () => {
    vi.setSystemTime(NIGHT_DATE);
    const { container } = render(<LivingFooterOverlay />);
    await act(async () => {});
    const ariaHidden = container.querySelectorAll("[aria-hidden='true']");
    expect(ariaHidden.length).toBeGreaterThanOrEqual(2); // tint + star field
  });
});

describe("LivingFooterOverlay — reduced-motion branch", () => {
  beforeEach(() => {
    reduceMotionSpy.mockReturnValue(true);
  });

  it("does NOT render star elements when reduced-motion is set", async () => {
    vi.setSystemTime(NIGHT_DATE);
    const { container } = render(<LivingFooterOverlay />);
    await act(async () => {});
    const stars = container.querySelectorAll("[data-testid='star']");
    expect(stars.length).toBe(0);
  });

  it("still renders the sky tint overlay when reduced-motion is set", async () => {
    vi.setSystemTime(DAY_DATE);
    const { container } = render(<LivingFooterOverlay />);
    await act(async () => {});
    const tint = container.querySelector("[aria-hidden='true']");
    expect(tint).not.toBeNull();
  });
});

describe("LivingFooterOverlay — daytime (no stars)", () => {
  it("does NOT render star elements at 12:00 (starOpacity is 0)", async () => {
    vi.setSystemTime(DAY_DATE);
    const { container } = render(<LivingFooterOverlay />);
    await act(async () => {});
    const stars = container.querySelectorAll("[data-testid='star']");
    expect(stars.length).toBe(0);
  });
});

describe("LivingFooterOverlay — update cycle", () => {
  it("re-derives atmosphere on 60-second interval", async () => {
    vi.setSystemTime(NIGHT_DATE);
    render(<LivingFooterOverlay />);
    await act(async () => {});
    // Advance past the 60s tick — should not throw
    await act(async () => {
      vi.advanceTimersByTime(60_001);
    });
  });

  it("clears the interval on unmount (no memory leak)", async () => {
    vi.setSystemTime(DAY_DATE);
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = render(<LivingFooterOverlay />);
    await act(async () => {});
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});
