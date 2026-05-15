import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

// cf-1imv: same localStorage stub pattern as AddToCompareButton.test.tsx
// so the bar reads/writes the cf-compare-slugs key the production
// helpers expect. The window event listeners are stubbed so the
// useEffect subscription registers cleanly under jsdom.
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
vi.stubGlobal("dispatchEvent", vi.fn());
vi.stubGlobal("addEventListener", vi.fn());
vi.stubGlobal("removeEventListener", vi.fn());

// framer-motion's AnimatePresence/m wrappers are noisy under jsdom; swap
// for plain elements so the test asserts on rendered DOM, not animation
// internals. (Pattern matches what BackToTop.test.tsx does.)
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: new Proxy(
    {},
    {
      get:
        () =>
        ({
          children,
          ...props
        }: {
          children?: React.ReactNode;
          [key: string]: unknown;
        }) => {
          // Strip framer-only props before forwarding to the DOM.
          const {
            initial: _i,
            animate: _a,
            exit: _e,
            transition: _t,
            ...rest
          } = props as Record<string, unknown>;
          return <div {...rest}>{children}</div>;
        },
    },
  ),
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

  it("Clear button hides the bar after clicking (state flushes to empty)", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["kingston"]);
    render(<CompareBar />);
    expect(
      screen.getByRole("region", { name: /compare queue/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("compare-bar-clear"));
    expect(screen.queryByRole("region", { name: /compare queue/i })).toBeNull();
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
    // Pin the positioning contract — the bar must be fixed + anchored to
    // the bottom edge so scroll behavior doesn't lose the queue.
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
