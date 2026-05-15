import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CompareBar } from "@/components/compare/CompareBar";
import * as compareState from "@/lib/product/compare-state";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
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
