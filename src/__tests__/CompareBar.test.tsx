import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CompareBar } from "@/components/compare/CompareBar";
import * as compareState from "@/lib/product/compare-state";

// cf-369: CompareBar reads usePathname() to hide on /compare. Default mock
// returns a non-/compare path; tests that exercise the /compare-hide path
// override the mock per-test.
const mockPathname = vi.fn(() => "/shop/futon-frames");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

beforeEach(() => {
  localStorage.clear();
  mockPathname.mockReturnValue("/shop/futon-frames");
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("CompareBar", () => {
  it("renders nothing when compare list is empty", () => {
    const { container } = render(<CompareBar />);
    expect(container.firstChild).toBeNull();
  });

  it("appears when 1 slug is added to localStorage", () => {
    compareState.setCompareSlugs(["kingston-futon-frame"]);
    render(<CompareBar />);
    expect(screen.getByTestId("compare-bar")).toBeInTheDocument();
  });

  it("shows correct item count — singular", () => {
    compareState.setCompareSlugs(["kingston-futon-frame"]);
    render(<CompareBar />);
    expect(screen.getByTestId("compare-bar-count")).toHaveTextContent("1 item");
  });

  it("shows correct item count — plural", () => {
    compareState.setCompareSlugs(["a", "b", "c"]);
    render(<CompareBar />);
    expect(screen.getByTestId("compare-bar-count")).toHaveTextContent("3 items");
  });

  it("does not show '(max)' when below COMPARE_MAX", () => {
    compareState.setCompareSlugs(["a", "b"]);
    render(<CompareBar />);
    expect(screen.getByTestId("compare-bar-count")).not.toHaveTextContent("max");
  });

  it("shows max label at COMPARE_MAX items", () => {
    compareState.setCompareSlugs(["a", "b", "c", "d"]); // COMPARE_MAX=4
    render(<CompareBar />);
    expect(screen.getByTestId("compare-bar-count")).toHaveTextContent("4 items (max)");
  });

  it("Compare CTA points to /compare?slugs=... with current slugs", () => {
    compareState.setCompareSlugs(["kingston-futon-frame", "sedona-futon-frame"]);
    render(<CompareBar />);
    const link = screen.getByRole("link", { name: /compare/i });
    expect(link).toHaveAttribute(
      "href",
      "/compare?slugs=kingston-futon-frame,sedona-futon-frame",
    );
  });

  // cf-369 (cf-ruhm.6): COMPARE_MIN gate + hide-on-/compare
  describe("cf-369: COMPARE_MIN gate", () => {
    it("disables the Compare CTA when only 1 slug is selected (< COMPARE_MIN)", () => {
      compareState.setCompareSlugs(["kingston-futon-frame"]);
      render(<CompareBar />);
      // Disabled state has no <a> link; it's a span with aria-disabled.
      expect(screen.queryByRole("link", { name: /compare/i })).toBeNull();
      const disabled = screen.getByTestId("compare-bar-compare-disabled");
      expect(disabled.getAttribute("aria-disabled")).toBe("true");
    });

    it("shows the 'add N more' hint when below COMPARE_MIN", () => {
      compareState.setCompareSlugs(["kingston-futon-frame"]);
      render(<CompareBar />);
      const hint = screen.getByTestId("compare-bar-hint");
      expect(hint.textContent).toMatch(/add 1 more/i);
    });

    it("enables the Compare CTA at COMPARE_MIN (2 slugs)", () => {
      compareState.setCompareSlugs(["a", "b"]);
      render(<CompareBar />);
      expect(screen.getByRole("link", { name: /compare/i })).toBeInTheDocument();
      expect(screen.queryByTestId("compare-bar-compare-disabled")).toBeNull();
      expect(screen.queryByTestId("compare-bar-hint")).toBeNull();
    });

    it("data-enough-to-compare reflects the gate state for styling/tests", () => {
      compareState.setCompareSlugs(["kingston-futon-frame"]);
      const { rerender } = render(<CompareBar />);
      expect(screen.getByTestId("compare-bar").getAttribute("data-enough-to-compare")).toBe("false");
      act(() => {
        compareState.setCompareSlugs(["a", "b"]);
      });
      rerender(<CompareBar />);
      expect(screen.getByTestId("compare-bar").getAttribute("data-enough-to-compare")).toBe("true");
    });
  });

  describe("cf-369: hide on /compare", () => {
    it("renders nothing when pathname is /compare (redundant with the page itself)", () => {
      mockPathname.mockReturnValue("/compare");
      compareState.setCompareSlugs(["a", "b"]);
      const { container } = render(<CompareBar />);
      expect(container.firstChild).toBeNull();
    });

    it("still renders on /compare-adjacent paths (e.g. /compare-noindex would be a real route)", () => {
      mockPathname.mockReturnValue("/shop/futon-frames");
      compareState.setCompareSlugs(["a", "b"]);
      render(<CompareBar />);
      expect(screen.getByTestId("compare-bar")).toBeInTheDocument();
    });
  });

  it("clear button resets localStorage and hides bar", () => {
    compareState.setCompareSlugs(["kingston-futon-frame"]);
    render(<CompareBar />);
    fireEvent.click(screen.getByTestId("compare-bar-clear"));
    expect(screen.queryByTestId("compare-bar")).toBeNull();
    expect(compareState.getCompareSlugs()).toHaveLength(0);
  });

  it("reacts to cf-compare-change events fired by another component", () => {
    render(<CompareBar />);
    expect(screen.queryByTestId("compare-bar")).toBeNull();
    act(() => {
      compareState.setCompareSlugs(["kingston-futon-frame"]);
    });
    expect(screen.getByTestId("compare-bar")).toBeInTheDocument();
  });

  it("hides again when all items are cleared via external event", () => {
    compareState.setCompareSlugs(["kingston-futon-frame"]);
    render(<CompareBar />);
    expect(screen.getByTestId("compare-bar")).toBeInTheDocument();
    act(() => {
      compareState.setCompareSlugs([]);
    });
    expect(screen.queryByTestId("compare-bar")).toBeNull();
  });
});
