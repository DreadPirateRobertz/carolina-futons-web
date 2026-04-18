import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { RouteProgressBar } from "@/components/site/RouteProgressBar";

// usePathname is what triggers the progress animation. Mock it per test so
// we can simulate a route change and assert the bar re-animates.
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

// Keep the real framer-motion runtime (AnimatePresence, m.*) but stub
// useReducedMotion so we can verify the no-motion path without touching
// window.matchMedia.
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>(
    "framer-motion",
  );
  return { ...actual, useReducedMotion: vi.fn() };
});

const { usePathname } = await import("next/navigation");
const { useReducedMotion } = await import("framer-motion");
const mockedPathname = vi.mocked(usePathname);
const mockedReducedMotion = vi.mocked(useReducedMotion);

beforeEach(() => {
  mockedReducedMotion.mockReturnValue(false);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("RouteProgressBar", () => {
  it("marks the wrapper with data-slot='route-progress-bar' for selector stability", () => {
    mockedPathname.mockReturnValue("/");
    render(<RouteProgressBar />);
    expect(
      document.querySelector("[data-slot='route-progress-bar']"),
    ).not.toBeNull();
  });

  it("exposes role=progressbar with aria-label for a11y tooling", () => {
    mockedPathname.mockReturnValue("/");
    const { container } = render(<RouteProgressBar />);
    const bar = container.querySelector("[role='progressbar']");
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute("aria-label")).toMatch(/page load|navigation/i);
  });

  it("renders fixed at the top of the viewport above page content", () => {
    mockedPathname.mockReturnValue("/");
    const { container } = render(<RouteProgressBar />);
    const root = container.querySelector<HTMLElement>(
      "[data-slot='route-progress-bar']",
    );
    expect(root).not.toBeNull();
    // Must be pinned to the top of the viewport and painted above header
    // chrome, so users see the bar during any nav-triggered re-render.
    expect(root?.className).toMatch(/fixed/);
    expect(root?.className).toMatch(/top-0/);
    expect(root?.className).toMatch(/z-\[?\d+/);
  });

  it("exposes the current pathname on a data attribute so route changes are observable", () => {
    mockedPathname.mockReturnValue("/products/a");
    render(<RouteProgressBar />);
    expect(
      document.querySelector("[data-pathname='/products/a']"),
    ).not.toBeNull();
  });

  it("swaps the pathname data attribute when the route changes", () => {
    mockedPathname.mockReturnValue("/products/a");
    const { rerender } = render(<RouteProgressBar />);
    expect(
      document.querySelector("[data-pathname='/products/a']"),
    ).not.toBeNull();

    mockedPathname.mockReturnValue("/products/b");
    rerender(<RouteProgressBar />);
    expect(
      document.querySelector("[data-pathname='/products/b']"),
    ).not.toBeNull();
  });

  it("coerces a null pathname to an empty string for SSR-stable rendering", () => {
    // usePathname() can return null during SSR / error boundaries — the bar
    // must not crash and should render with an empty pathname attr.
    mockedPathname.mockReturnValue(null as unknown as string);
    render(<RouteProgressBar />);
    expect(document.querySelector("[data-pathname='']")).not.toBeNull();
  });

  it("still renders when reduced-motion is preferred (no crash, just no animation)", () => {
    mockedReducedMotion.mockReturnValue(true);
    mockedPathname.mockReturnValue("/");
    render(<RouteProgressBar />);
    expect(
      document.querySelector("[data-slot='route-progress-bar']"),
    ).not.toBeNull();
  });
});
