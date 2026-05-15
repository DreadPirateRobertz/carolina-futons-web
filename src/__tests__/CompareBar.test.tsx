import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

// cf-1imv: localStorage stub mirrors the pattern AddToCompareButton uses,
// but window.{add,remove}EventListener are NOT stubbed — the bar's
// live-update path runs through the real subscription so we can test
// it end-to-end (mutate storage → dispatch event → bar re-renders).
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

// framer-motion's AnimatePresence/m wrappers are noisy under jsdom; swap
// for plain elements so DOM assertions don't depend on animation timing.
// We knowingly trade exit-animation coverage for assertion stability —
// the production code path is exercised by the e2e suite, not here.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    // CompareBar only uses m.div; expand if/when it grows other motion
    // primitives. Keeping the surface tight beats a generic Proxy.
    div: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

import { CompareBar } from "@/components/compare/CompareBar";

beforeEach(() => {
  Object.keys(storage).forEach((k) => delete storage[k]);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("CompareBar", () => {
  it("renders nothing when localStorage is empty (0 items)", () => {
    render(<CompareBar />);
    expect(screen.queryByRole("region", { name: /compare queue/i })).toBeNull();
    expect(screen.queryByTestId("compare-bar-cta")).toBeNull();
  });

  it("renders the bar when 1 item is queued", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["kingston"]);
    render(<CompareBar />);
    expect(
      screen.getByRole("region", { name: /compare queue/i }),
    ).toBeInTheDocument();
  });

  it("renders the singular count label '1 item selected'", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["kingston"]);
    render(<CompareBar />);
    expect(screen.getByText("1 item selected")).toBeInTheDocument();
  });

  it("renders the plural count label for 2+ items", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["kingston", "sedona"]);
    render(<CompareBar />);
    expect(screen.getByText("2 items selected")).toBeInTheDocument();
  });

  it("Compare CTA href encodes the slugs into /compare?slugs=...", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["kingston", "sedona"]);
    render(<CompareBar />);
    const cta = screen.getByTestId("compare-bar-cta");
    expect(cta.getAttribute("href")).toBe("/compare?slugs=kingston,sedona");
  });

  it("Compare CTA is rendered as an anchor (server-routable, not a JS handler)", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["kingston"]);
    render(<CompareBar />);
    expect(screen.getByTestId("compare-bar-cta").tagName).toBe("A");
  });

  it("Clear button resets localStorage to empty array", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["kingston", "sedona"]);
    render(<CompareBar />);
    fireEvent.click(screen.getByTestId("compare-bar-clear"));
    expect(JSON.parse(storage["cf-compare-slugs"])).toEqual([]);
  });

  it("Clear button hides the bar (via cf-compare-change live-update path)", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["kingston"]);
    render(<CompareBar />);
    expect(
      screen.getByRole("region", { name: /compare queue/i }),
    ).toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByTestId("compare-bar-clear"));
    });
    expect(screen.queryByRole("region", { name: /compare queue/i })).toBeNull();
  });

  it("re-renders when another component dispatches cf-compare-change (live-sync)", () => {
    // Start hidden (no items). Simulate AddToCompareButton click on
    // another part of the page: write to storage + dispatch event.
    // Bar must appear without remount.
    render(<CompareBar />);
    expect(screen.queryByRole("region", { name: /compare queue/i })).toBeNull();

    act(() => {
      storage["cf-compare-slugs"] = JSON.stringify(["kingston"]);
      window.dispatchEvent(new Event("cf-compare-change"));
    });

    expect(
      screen.getByRole("region", { name: /compare queue/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 item selected")).toBeInTheDocument();
  });

  it("Clear button exposes an accessible label for keyboard / screen-reader users", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["kingston"]);
    render(<CompareBar />);
    const clearBtn = screen.getByLabelText("Clear compare selection");
    expect(clearBtn).toBe(screen.getByTestId("compare-bar-clear"));
  });

  it("renders the bar at the document bottom via fixed positioning", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["kingston"]);
    render(<CompareBar />);
    const bar = screen.getByRole("region", { name: /compare queue/i });
    // Pin the positioning contract — fixed + bottom-0 so the queue
    // stays visible during scroll.
    expect(bar.className).toMatch(/\bfixed\b/);
    expect(bar.className).toMatch(/\bbottom-0\b/);
  });

  it("ignores malformed localStorage (non-array JSON) without crashing", () => {
    storage["cf-compare-slugs"] = JSON.stringify({ not: "an array" });
    render(<CompareBar />);
    // getCompareSlugs() returns [] for non-array shapes — bar stays hidden.
    expect(screen.queryByRole("region", { name: /compare queue/i })).toBeNull();
  });
});
