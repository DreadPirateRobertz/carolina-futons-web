import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

// Mock useReducedMotion so we can exercise both motion and no-motion paths.
const mockUseReducedMotion = vi.fn<() => boolean | null>();
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>(
    "framer-motion",
  );
  return { ...actual, useReducedMotion: () => mockUseReducedMotion() };
});

// Mock next/navigation router.push so we can assert without real navigation.
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { ViewTransitionLink } from "@/components/motion/ViewTransitionLink";

function setupVT(supported: boolean) {
  if (supported) {
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      writable: true,
      value: vi.fn((cb: () => void) => {
        cb();
        return { ready: Promise.resolve(), finished: Promise.resolve() };
      }),
    });
  } else {
    // @ts-expect-error — deleting non-optional for test
    delete document.startViewTransition;
  }
}

beforeEach(() => {
  mockUseReducedMotion.mockReturnValue(false);
  mockPush.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ViewTransitionLink", () => {
  it("renders an anchor with the given href and children", () => {
    setupVT(false);
    render(
      <ViewTransitionLink href="/products/cambridge">
        Cambridge Futon
      </ViewTransitionLink>,
    );
    const link = screen.getByRole("link", { name: /cambridge futon/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/products/cambridge");
  });

  it("calls startViewTransition on plain click when API is available", () => {
    setupVT(true);
    render(
      <ViewTransitionLink href="/products/cambridge">
        Cambridge
      </ViewTransitionLink>,
    );
    fireEvent.click(screen.getByRole("link"));
    expect(document.startViewTransition).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/products/cambridge");
  });

  it("falls back to router.push without startViewTransition when API is absent", () => {
    setupVT(false);
    render(
      <ViewTransitionLink href="/products/alpine">Alpine</ViewTransitionLink>,
    );
    fireEvent.click(screen.getByRole("link"));
    expect(mockPush).toHaveBeenCalledWith("/products/alpine");
  });

  it("skips startViewTransition and uses router.push when prefersReducedMotion is true", () => {
    setupVT(true);
    mockUseReducedMotion.mockReturnValue(true);
    render(
      <ViewTransitionLink href="/products/northampton">
        Northampton
      </ViewTransitionLink>,
    );
    fireEvent.click(screen.getByRole("link"));
    expect(document.startViewTransition).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/products/northampton");
  });

  it("does NOT intercept metaKey clicks (new-tab intent)", () => {
    setupVT(true);
    render(
      <ViewTransitionLink href="/products/cambridge">
        Cambridge
      </ViewTransitionLink>,
    );
    fireEvent.click(screen.getByRole("link"), { metaKey: true });
    expect(document.startViewTransition).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does NOT intercept ctrlKey clicks", () => {
    setupVT(true);
    render(
      <ViewTransitionLink href="/products/cambridge">
        Cambridge
      </ViewTransitionLink>,
    );
    fireEvent.click(screen.getByRole("link"), { ctrlKey: true });
    expect(document.startViewTransition).not.toHaveBeenCalled();
  });

  it("forwards additional props (className, data-testid) to the underlying anchor", () => {
    setupVT(false);
    render(
      <ViewTransitionLink
        href="/shop"
        className="my-class"
        data-testid="vt-link"
      >
        Shop
      </ViewTransitionLink>,
    );
    const link = screen.getByTestId("vt-link");
    expect(link.className).toContain("my-class");
  });
});
