import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { PageTransition } from "@/components/motion/PageTransition";
import * as configModule from "@/lib/motion/page-transition-config";

// usePathname is the source of the transition key. Mock it per test so we can
// simulate a route change and assert the wrapper re-keys.
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

// Mock useReducedMotion so we can verify the hook→config wiring deterministically.
// Other framer-motion exports (AnimatePresence, m.*, LazyMotion) must stay live.
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return { ...actual, useReducedMotion: vi.fn() };
});

const { usePathname } = await import("next/navigation");
const { useReducedMotion } = await import("framer-motion");
const mockedPathname = vi.mocked(usePathname);
const mockedReducedMotion = vi.mocked(useReducedMotion);

beforeEach(() => {
  // Default to "motion allowed" so existing tests keep their prior behavior.
  mockedReducedMotion.mockReturnValue(false);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PageTransition", () => {
  it("renders children", () => {
    mockedPathname.mockReturnValue("/products/a");
    render(
      <PageTransition>
        <p data-testid="child">hello</p>
      </PageTransition>,
    );
    expect(screen.getByTestId("child").textContent).toBe("hello");
  });

  it("exposes the current pathname on a data attribute so the route key is observable", () => {
    mockedPathname.mockReturnValue("/products/a");
    render(
      <PageTransition>
        <p>a</p>
      </PageTransition>,
    );
    // Use data-pathname so tests can verify the AnimatePresence child swaps
    // key when the route changes, without depending on framer-motion's
    // internal animation runtime.
    expect(
      document.querySelector("[data-pathname='/products/a']"),
    ).not.toBeNull();
  });

  it("swaps the pathname data attribute when the route changes", () => {
    mockedPathname.mockReturnValue("/products/a");
    const { rerender } = render(
      <PageTransition>
        <p>a</p>
      </PageTransition>,
    );
    expect(
      document.querySelector("[data-pathname='/products/a']"),
    ).not.toBeNull();

    mockedPathname.mockReturnValue("/products/b");
    rerender(
      <PageTransition>
        <p>b</p>
      </PageTransition>,
    );
    expect(
      document.querySelector("[data-pathname='/products/b']"),
    ).not.toBeNull();
  });

  it("marks the wrapper with data-slot='page-transition' for selector stability", () => {
    mockedPathname.mockReturnValue("/");
    render(
      <PageTransition>
        <p>home</p>
      </PageTransition>,
    );
    expect(
      document.querySelector("[data-slot='page-transition']"),
    ).not.toBeNull();
  });

  it("coerces a null pathname to an empty string for a stable AnimatePresence key (SSR guard)", () => {
    // Cast through unknown since the typed signature promises a string, but the
    // runtime can momentarily return null during SSR / error boundaries.
    mockedPathname.mockReturnValue(null as unknown as string);
    render(
      <PageTransition>
        <p>ssr</p>
      </PageTransition>,
    );
    expect(document.querySelector("[data-pathname='']")).not.toBeNull();
  });
});

describe("PageTransition — useReducedMotion wiring", () => {
  it("passes reducedMotion=false to the config when the hook returns false", () => {
    const spy = vi.spyOn(configModule, "getPageTransitionVariants");
    mockedPathname.mockReturnValue("/");
    mockedReducedMotion.mockReturnValue(false);
    render(
      <PageTransition>
        <p>x</p>
      </PageTransition>,
    );
    expect(spy).toHaveBeenCalledWith({ reducedMotion: false });
  });

  it("passes reducedMotion=true to the config when the hook returns true", () => {
    const spy = vi.spyOn(configModule, "getPageTransitionVariants");
    mockedPathname.mockReturnValue("/");
    mockedReducedMotion.mockReturnValue(true);
    render(
      <PageTransition>
        <p>x</p>
      </PageTransition>,
    );
    expect(spy).toHaveBeenCalledWith({ reducedMotion: true });
  });

  it("coerces a null hook result (SSR / no-support) to reducedMotion=false", () => {
    const spy = vi.spyOn(configModule, "getPageTransitionVariants");
    mockedPathname.mockReturnValue("/");
    mockedReducedMotion.mockReturnValue(null);
    render(
      <PageTransition>
        <p>x</p>
      </PageTransition>,
    );
    expect(spy).toHaveBeenCalledWith({ reducedMotion: false });
  });
});
