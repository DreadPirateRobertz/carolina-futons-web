import { afterEach, describe, it, expect, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { BackToTop } from "@/components/site/BackToTop";

// Keep the real framer-motion runtime for AnimatePresence + m.*; nothing to
// mock here since BackToTop reads scroll position from window, not a hook.

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  // Reset virtual scroll so state doesn't leak between tests.
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});

function setScrollY(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  fireEvent.scroll(window);
}

describe("BackToTop", () => {
  it("marks the button with data-slot='back-to-top' for selector stability", () => {
    render(<BackToTop />);
    setScrollY(500);
    const btn = document.querySelector("[data-slot='back-to-top']");
    expect(btn).not.toBeNull();
  });

  it("exposes sr-only label 'Back to top' via aria-label", () => {
    render(<BackToTop />);
    setScrollY(500);
    // The button is keyboard-focusable and labeled for screen readers.
    expect(
      screen.getByRole("button", { name: /back to top/i }),
    ).toBeInTheDocument();
  });

  it("is hidden before the user scrolls past 400px", () => {
    render(<BackToTop />);
    // Initial scrollY is 0 — button should not be present in the tree.
    setScrollY(0);
    expect(
      screen.queryByRole("button", { name: /back to top/i }),
    ).not.toBeInTheDocument();
  });

  it("is hidden at exactly 400px (threshold is strictly greater than)", () => {
    render(<BackToTop />);
    setScrollY(400);
    expect(
      screen.queryByRole("button", { name: /back to top/i }),
    ).not.toBeInTheDocument();
  });

  it("appears after scrolling past 400px", () => {
    render(<BackToTop />);
    setScrollY(401);
    expect(
      screen.getByRole("button", { name: /back to top/i }),
    ).toBeInTheDocument();
  });

  it("hides again when the user scrolls back above the threshold", () => {
    render(<BackToTop />);
    setScrollY(800);
    expect(
      screen.getByRole("button", { name: /back to top/i }),
    ).toBeInTheDocument();
    setScrollY(100);
    expect(
      screen.queryByRole("button", { name: /back to top/i }),
    ).not.toBeInTheDocument();
  });

  it("is fixed to the bottom-right of the viewport when visible", () => {
    render(<BackToTop />);
    setScrollY(500);
    const btn = screen.getByRole("button", { name: /back to top/i });
    expect(btn.className).toMatch(/fixed/);
    expect(btn.className).toMatch(/bottom-/);
    expect(btn.className).toMatch(/right-/);
  });

  it("smooth-scrolls to the top of the document on click", () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
    render(<BackToTop />);
    setScrollY(500);
    act(() => {
      screen.getByRole("button", { name: /back to top/i }).click();
    });
    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: 0, behavior: "smooth" }),
    );
  });
});
