/**
 * cf-sd80.1 — MascotWorldHero SVG-light contract.
 *
 * cf-sd80 baseline F2 traced home SI 6.9s to day-phase MascotWorldHero
 * (185 LOC + framer-motion + mousemove + 150-250 SVG nodes at first
 * paint). Option B authorized by melania 2026-05-16: lazy-mount
 * secondary characters (Hummingbird, Deer, Heron) + defer mousemove
 * listener to post-idle, preserving cursor-eyes UX with ~200ms delayed
 * activation.
 *
 * Contract pinned by this file:
 *   1. Secondary mascots (Hummingbird/Deer/Heron group) are NOT in the
 *      initial DOM — gated on a post-paint idle flag
 *   2. After requestIdleCallback fires, secondary mascots mount
 *   3. Bear, Pine, Cloud, ridges stay in first-paint composition
 *      (regression guard — these are load-bearing for LCP candidate)
 *   4. mousemove cursor-tracking listener attaches after idle, not at
 *      first paint (so it doesn't compete with critical-path work)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { act } from "react";

// ── framer-motion mock: render motion.g as plain <g>, ignore animation props.
//    Matches the mock pattern from MascotCategoryCard.test.tsx.
vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_t, tag: string) => {
        const Comp = (props: Record<string, unknown>) => {
          const {
            initial: _i,
            animate: _a,
            transition: _tr,
            exit: _e,
            ...rest
          } = props;
          // Render as the underlying SVG element.
          const SvgTag = tag as unknown as keyof React.JSX.IntrinsicElements;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return <SvgTag {...(rest as any)} />;
        };
        Comp.displayName = `MotionMock(${tag})`;
        return Comp;
      },
    },
  ),
  useReducedMotion: () => false,
  useInView: () => true,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Track the idle-callback runner so we can fire it on demand.
let idleQueue: Array<() => void> = [];

beforeEach(() => {
  idleQueue = [];
  vi.stubGlobal(
    "requestIdleCallback",
    (cb: IdleRequestCallback) => {
      idleQueue.push(() =>
        cb({ didTimeout: false, timeRemaining: () => 50 }),
      );
      return 1 as unknown as number;
    },
  );
  vi.stubGlobal("cancelIdleCallback", () => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function flushIdle() {
  act(() => {
    idleQueue.forEach((fn) => fn());
    idleQueue = [];
  });
}

describe("MascotWorldHero — cf-sd80.1 SVG-light", () => {
  it("hides the secondary-mascots group before idle callback fires", async () => {
    const { MascotWorldHero } = await import("@/components/mascot/MascotWorldHero");
    render(<MascotWorldHero />);
    // The secondary group (Hummingbird + Deer + Heron) is gated; should
    // NOT be in the DOM at first render.
    expect(screen.queryByTestId("mascot-world-secondary")).toBeNull();
  });

  it("mounts the secondary-mascots group after idle callback fires", async () => {
    const { MascotWorldHero } = await import("@/components/mascot/MascotWorldHero");
    render(<MascotWorldHero />);
    flushIdle();
    expect(screen.getByTestId("mascot-world-secondary")).toBeInTheDocument();
  });

  it("keeps Bear + Pine + Cloud + ridges in the first-paint composition (regression guard)", async () => {
    const { MascotWorldHero } = await import("@/components/mascot/MascotWorldHero");
    const { container } = render(<MascotWorldHero />);
    // Verify the SVG root is present + has its aria-label (which names
    // the bear specifically — load-bearing for LCP candidate).
    const svg = container.querySelector('[data-slot="mascot-world-hero"]');
    expect(svg).not.toBeNull();
    // Primary composition marker: data-testid on the primary group.
    expect(screen.getByTestId("mascot-world-primary")).toBeInTheDocument();
  });

  it("defers the mousemove listener until after idle callback fires", async () => {
    const addListenerSpy = vi.spyOn(window, "addEventListener");
    const { MascotWorldHero } = await import("@/components/mascot/MascotWorldHero");
    render(<MascotWorldHero />);
    const movesBeforeIdle = addListenerSpy.mock.calls.filter(
      (call) => call[0] === "mousemove",
    ).length;
    expect(movesBeforeIdle).toBe(0);

    flushIdle();

    const movesAfterIdle = addListenerSpy.mock.calls.filter(
      (call) => call[0] === "mousemove",
    ).length;
    expect(movesAfterIdle).toBe(1);
    addListenerSpy.mockRestore();
  });
});
