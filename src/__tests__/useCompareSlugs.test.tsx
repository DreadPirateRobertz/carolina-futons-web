import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

// cf-1imv: hook owns the cf-compare-change subscription contract — these
// tests deliberately DO NOT stub window.addEventListener / removeEventListener
// (unlike AddToCompareButton.test.tsx + CompareBar.test.tsx) so the live-
// update path is exercised end-to-end: real event dispatch → real listener
// → state re-render → caller re-render.
//
// localStorage stub is per-test so each scenario starts from a clean queue.
const storage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => {
    storage[k] = v;
  },
  removeItem: (k: string) => {
    delete storage[k];
  },
});

import { useCompareSlugs } from "@/lib/product/use-compare-slugs";

// Tiny harness component so we can drive the hook and inspect its output
// via DOM without pulling in a full @testing-library/react-hooks dance.
function Harness() {
  const slugs = useCompareSlugs();
  return <div data-testid="slugs">{slugs.join(",")}</div>;
}

beforeEach(() => {
  Object.keys(storage).forEach((k) => delete storage[k]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useCompareSlugs", () => {
  it("returns [] when localStorage is empty on first render (SSR-safe)", () => {
    const { getByTestId } = render(<Harness />);
    expect(getByTestId("slugs").textContent).toBe("");
  });

  it("hydrates from localStorage on mount (lazy initializer)", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["kingston", "sedona"]);
    const { getByTestId } = render(<Harness />);
    expect(getByTestId("slugs").textContent).toBe("kingston,sedona");
  });

  it("re-renders when cf-compare-change fires (the live-sync contract)", () => {
    const { getByTestId } = render(<Harness />);
    expect(getByTestId("slugs").textContent).toBe("");

    // Simulate another component mutating localStorage + dispatching the
    // event. This is the path AddToCompareButton + CompareBar both rely
    // on — without it, the bar would never update after a card click.
    act(() => {
      storage["cf-compare-slugs"] = JSON.stringify(["kingston"]);
      window.dispatchEvent(new Event("cf-compare-change"));
    });

    expect(getByTestId("slugs").textContent).toBe("kingston");
  });

  it("re-renders again on subsequent events (subscription persists)", () => {
    const { getByTestId } = render(<Harness />);

    act(() => {
      storage["cf-compare-slugs"] = JSON.stringify(["a"]);
      window.dispatchEvent(new Event("cf-compare-change"));
    });
    expect(getByTestId("slugs").textContent).toBe("a");

    act(() => {
      storage["cf-compare-slugs"] = JSON.stringify(["a", "b"]);
      window.dispatchEvent(new Event("cf-compare-change"));
    });
    expect(getByTestId("slugs").textContent).toBe("a,b");

    act(() => {
      storage["cf-compare-slugs"] = JSON.stringify([]);
      window.dispatchEvent(new Event("cf-compare-change"));
    });
    expect(getByTestId("slugs").textContent).toBe("");
  });

  it("cleans up the listener on unmount (no leak across remounts)", () => {
    // Spy on the real window methods to catch missing cleanup. Pre-hook
    // refactor, each consumer wired its own listener; the hook centralizes
    // the contract — verify the cleanup actually fires.
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = render(<Harness />);

    const addCalls = addSpy.mock.calls.filter(
      ([event]) => event === "cf-compare-change",
    );
    expect(addCalls.length).toBeGreaterThanOrEqual(1);

    unmount();

    const removeCalls = removeSpy.mock.calls.filter(
      ([event]) => event === "cf-compare-change",
    );
    // Should match the addEventListener call count and pass the same
    // handler reference (otherwise the listener leaks).
    expect(removeCalls.length).toBe(addCalls.length);
    expect(removeCalls[0]?.[1]).toBe(addCalls[0]?.[1]);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("ignores events on the same tick that don't change storage shape", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["kingston"]);
    const { getByTestId } = render(<Harness />);
    expect(getByTestId("slugs").textContent).toBe("kingston");

    // Same payload — re-dispatch the event. State setter will receive an
    // equal-shape array, but React doesn't deep-compare arrays so a
    // re-render does happen. We're just pinning that the value remains
    // observably correct.
    act(() => {
      window.dispatchEvent(new Event("cf-compare-change"));
    });

    expect(getByTestId("slugs").textContent).toBe("kingston");
  });
});
