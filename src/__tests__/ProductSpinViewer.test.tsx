import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import {
  buildAutoSpinSequence,
  computeFrameIndex,
  ProductSpinViewer,
  shouldShowSpinViewer,
} from "@/components/product/ProductSpinViewer";

// ── matchMedia stub (jsdom has no matchMedia) ─────────────────────────────────

let capturedChangeHandler: ((e: MediaQueryListEvent) => void) | null = null;

function makeMatchMedia(matches = false) {
  capturedChangeHandler = null;
  return vi.fn().mockReturnValue({
    matches,
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
      if (event === "change") capturedChangeHandler = handler;
    }),
    removeEventListener: vi.fn(),
  });
}

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: makeMatchMedia(false),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ── computeFrameIndex ─────────────────────────────────────────────────────────

describe("computeFrameIndex", () => {
  it("returns 0 for zero delta", () => {
    expect(computeFrameIndex(0, 0, 8)).toBe(0);
  });

  it("advances frame on positive drag delta", () => {
    expect(computeFrameIndex(0, 8, 8)).toBe(1);
  });

  it("goes back on negative drag delta", () => {
    expect(computeFrameIndex(2, -8, 8)).toBe(1);
  });

  it("wraps forward past last frame", () => {
    expect(computeFrameIndex(7, 8, 8)).toBe(0);
  });

  it("wraps backward before first frame", () => {
    expect(computeFrameIndex(0, -8, 8)).toBe(7);
  });

  it("handles large delta spanning multiple frames", () => {
    expect(computeFrameIndex(0, 24, 8)).toBe(3);
  });

  it("rounds partial drag to nearest frame", () => {
    expect(computeFrameIndex(2, 4, 8)).toBe(3);
  });

  it("returns 0 for zero totalFrames", () => {
    expect(computeFrameIndex(0, 100, 0)).toBe(0);
  });

  it("uses custom pxPerFrame", () => {
    expect(computeFrameIndex(0, 20, 10, 10)).toBe(2);
  });
});

// ── buildAutoSpinSequence ─────────────────────────────────────────────────────

describe("buildAutoSpinSequence", () => {
  it("returns empty for 0 frames", () => {
    expect(buildAutoSpinSequence(0, 3)).toEqual([]);
  });

  it("returns empty for 0 rotations", () => {
    expect(buildAutoSpinSequence(8, 0)).toEqual([]);
  });

  it("returns 1 full rotation for 8 frames × 1 rotation", () => {
    const seq = buildAutoSpinSequence(8, 1);
    expect(seq).toHaveLength(8);
    expect(seq[0]).toBe(0);
    expect(seq[7]).toBe(7);
  });

  it("returns 3 full rotations for 8 frames × 3 rotations", () => {
    const seq = buildAutoSpinSequence(8, 3);
    expect(seq).toHaveLength(24);
    expect(seq[8]).toBe(0);
    expect(seq[16]).toBe(0);
  });

  it("frame indices never exceed totalFrames-1", () => {
    const seq = buildAutoSpinSequence(6, 3);
    for (const f of seq) {
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(6);
    }
  });
});

// ── shouldShowSpinViewer ──────────────────────────────────────────────────────

describe("shouldShowSpinViewer", () => {
  it("returns true for 2+ images", () => {
    expect(shouldShowSpinViewer(["a.jpg", "b.jpg"])).toBe(true);
  });

  it("returns false for 1 image", () => {
    expect(shouldShowSpinViewer(["a.jpg"])).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(shouldShowSpinViewer([])).toBe(false);
  });

  it("returns false for null", () => {
    expect(shouldShowSpinViewer(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(shouldShowSpinViewer(undefined)).toBe(false);
  });
});

// ── ProductSpinViewer component ───────────────────────────────────────────────

const FRAMES = Array.from({ length: 8 }, (_, i) => `https://cdn.example.com/spin-${i}.jpg`);

function renderSpin(spinImages = FRAMES, productName?: string) {
  return render(<ProductSpinViewer spinImages={spinImages} productName={productName} />);
}

describe("ProductSpinViewer", () => {
  it("renders first frame image on mount", () => {
    renderSpin();
    expect(screen.getByTestId("spin-frame-img")).toHaveAttribute("src", FRAMES[0]);
  });

  it("shows 360° badge", () => {
    renderSpin();
    expect(screen.getByTestId("spin-badge")).toHaveTextContent("360°");
  });

  it("shows drag hint", () => {
    renderSpin();
    expect(screen.getByTestId("spin-hint")).toHaveTextContent("Drag to rotate");
  });

  it("aria-label includes productName", () => {
    renderSpin(FRAMES, "Futon Supreme");
    expect(screen.getByTestId("product-spin-viewer")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Futon Supreme")
    );
  });

  it("role=slider with aria-value attributes", () => {
    renderSpin();
    const viewer = screen.getByTestId("product-spin-viewer");
    expect(viewer).toHaveAttribute("role", "slider");
    expect(viewer).toHaveAttribute("aria-valuemin", "0");
    expect(viewer).toHaveAttribute("aria-valuemax", "7");
    expect(viewer).toHaveAttribute("aria-valuenow", "0");
  });

  it("mousedown + mousemove advances frame by 1 (8px drag)", () => {
    renderSpin();
    const viewer = screen.getByTestId("product-spin-viewer");
    fireEvent.mouseDown(viewer, { clientX: 0 });
    fireEvent.mouseMove(viewer, { clientX: 8 });
    expect(screen.getByTestId("spin-frame-img")).toHaveAttribute("src", FRAMES[1]);
  });

  it("mousemove without mousedown is a no-op", () => {
    renderSpin();
    const viewer = screen.getByTestId("product-spin-viewer");
    fireEvent.mouseMove(viewer, { clientX: 100 });
    expect(screen.getByTestId("spin-frame-img")).toHaveAttribute("src", FRAMES[0]);
  });

  it("mouseLeave clears drag state — subsequent mousemove is no-op", () => {
    renderSpin();
    const viewer = screen.getByTestId("product-spin-viewer");
    fireEvent.mouseDown(viewer, { clientX: 0 });
    fireEvent.mouseLeave(viewer);
    const srcAfterLeave = screen.getByTestId("spin-frame-img").getAttribute("src");
    fireEvent.mouseMove(viewer, { clientX: 8 });
    expect(screen.getByTestId("spin-frame-img")).toHaveAttribute("src", srcAfterLeave);
  });

  it("ArrowRight advances one frame", () => {
    renderSpin();
    const viewer = screen.getByTestId("product-spin-viewer");
    fireEvent.keyDown(viewer, { key: "ArrowRight" });
    expect(screen.getByTestId("spin-frame-img")).toHaveAttribute("src", FRAMES[1]);
  });

  it("ArrowLeft goes back one frame (wraps to last from frame 0)", () => {
    renderSpin();
    const viewer = screen.getByTestId("product-spin-viewer");
    fireEvent.keyDown(viewer, { key: "ArrowLeft" });
    expect(screen.getByTestId("spin-frame-img")).toHaveAttribute("src", FRAMES[7]);
  });

  it("ArrowRight wraps past last frame", () => {
    renderSpin(["a.jpg", "b.jpg"]);
    const viewer = screen.getByTestId("product-spin-viewer");
    fireEvent.keyDown(viewer, { key: "ArrowRight" });
    fireEvent.keyDown(viewer, { key: "ArrowRight" });
    expect(screen.getByTestId("spin-frame-img")).toHaveAttribute("src", "a.jpg");
  });

  describe("auto-spin", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("advances to frame 1 on first tick (step starts at 1)", () => {
      renderSpin();
      act(() => { vi.advanceTimersByTime(60); });
      expect(screen.getByTestId("spin-frame-img")).toHaveAttribute("src", FRAMES[1]);
    });

    it("advances to frame 2 on second tick", () => {
      renderSpin();
      act(() => { vi.advanceTimersByTime(120); });
      expect(screen.getByTestId("spin-frame-img")).toHaveAttribute("src", FRAMES[2]);
    });

    it("stops after sequence is exhausted — frame stays at last value", () => {
      renderSpin();
      // 23 ticks reach sequence[23]=7; 24th tick clears the interval
      act(() => { vi.advanceTimersByTime(60 * 24); });
      expect(screen.getByTestId("spin-frame-img")).toHaveAttribute("src", FRAMES[7]);
      act(() => { vi.advanceTimersByTime(60 * 5); });
      expect(screen.getByTestId("spin-frame-img")).toHaveAttribute("src", FRAMES[7]);
    });

    it("mousedown cancels auto-spin so subsequent ticks are no-ops", () => {
      renderSpin();
      act(() => { vi.advanceTimersByTime(60); }); // first tick → frame 1
      const viewer = screen.getByTestId("product-spin-viewer");
      fireEvent.mouseDown(viewer, { clientX: 0 });
      const srcAfterCancel = screen.getByTestId("spin-frame-img").getAttribute("src");
      act(() => { vi.advanceTimersByTime(60 * 10); });
      expect(screen.getByTestId("spin-frame-img")).toHaveAttribute("src", srcAfterCancel);
    });
  });

  describe("reduced motion", () => {
    beforeEach(() => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: makeMatchMedia(true),
      });
      vi.useFakeTimers();
    });
    afterEach(() => vi.useRealTimers());

    it("skips auto-spin entirely when prefers-reduced-motion is set at mount", () => {
      renderSpin();
      act(() => { vi.advanceTimersByTime(60 * 10); });
      expect(screen.getByTestId("spin-frame-img")).toHaveAttribute("src", FRAMES[0]);
    });
  });

  describe("matchMedia change event", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("stops auto-spin when OS preference changes to reduced-motion mid-session", () => {
      renderSpin();
      act(() => { vi.advanceTimersByTime(60); }); // frame 1
      act(() => { capturedChangeHandler?.({ matches: true } as MediaQueryListEvent); });
      const srcAfterChange = screen.getByTestId("spin-frame-img").getAttribute("src");
      act(() => { vi.advanceTimersByTime(60 * 10); });
      expect(screen.getByTestId("spin-frame-img")).toHaveAttribute("src", srcAfterChange);
    });
  });

  describe("native touch (non-passive touchmove path)", () => {
    it("registers touchmove listener with passive:false", () => {
      const spy = vi.spyOn(HTMLDivElement.prototype, "addEventListener");
      renderSpin();
      const call = spy.mock.calls.find(
        ([evt, , opts]) => evt === "touchmove" && (opts as AddEventListenerOptions)?.passive === false
      );
      expect(call).toBeDefined();
    });

    it("touchmove handler advances frame when drag is primed", () => {
      let capturedHandler: ((e: TouchEvent) => void) | null = null;
      const original = HTMLDivElement.prototype.addEventListener;
      vi.spyOn(HTMLDivElement.prototype, "addEventListener").mockImplementation(
        function (this: HTMLDivElement, ...args: Parameters<typeof HTMLDivElement.prototype.addEventListener>) {
          if (args[0] === "touchmove") capturedHandler = args[1] as (e: TouchEvent) => void;
          return original.apply(this, args);
        }
      );
      renderSpin();
      const viewer = screen.getByTestId("product-spin-viewer");
      // Prime drag state via React touchStart
      fireEvent.touchStart(viewer, { touches: [{ clientX: 0, identifier: 0, target: viewer }] });
      // Call the captured native handler directly (jsdom has no Touch constructor)
      act(() => {
        capturedHandler?.({
          touches: [{ clientX: 8 }] as unknown as TouchList,
          preventDefault: vi.fn(),
        } as unknown as TouchEvent);
      });
      expect(screen.getByTestId("spin-frame-img")).toHaveAttribute("src", FRAMES[1]);
    });
  });
});
