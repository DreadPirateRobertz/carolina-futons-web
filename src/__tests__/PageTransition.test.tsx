import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { PageTransition } from "@/components/motion/PageTransition";

// usePathname is the source of the transition key. Mock it per test so we can
// simulate a route change and assert the wrapper re-keys.
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const { usePathname } = await import("next/navigation");
const mockedPathname = vi.mocked(usePathname);

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
});
