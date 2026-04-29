import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

// Mock localStorage and window.dispatchEvent before module import.
const storage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = v; },
  removeItem: (k: string) => { delete storage[k]; },
});
vi.stubGlobal("dispatchEvent", vi.fn());
vi.stubGlobal("addEventListener", vi.fn());
vi.stubGlobal("removeEventListener", vi.fn());

import { AddToCompareButton } from "@/components/compare/AddToCompareButton";

beforeEach(() => {
  Object.keys(storage).forEach((k) => delete storage[k]);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AddToCompareButton", () => {
  it("renders 'Compare' when the slug is not in the list", () => {
    render(<AddToCompareButton slug="kingston" />);
    expect(screen.getByTestId("add-to-compare")).toHaveTextContent("Compare");
    expect(screen.getByTestId("add-to-compare")).toHaveAttribute("aria-pressed", "false");
  });

  it("shows 'In compare' when slug is already selected", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["kingston"]);
    render(<AddToCompareButton slug="kingston" />);
    expect(screen.getByTestId("add-to-compare")).toHaveTextContent("In compare");
    expect(screen.getByTestId("add-to-compare")).toHaveAttribute("aria-pressed", "true");
  });

  it("adds slug to compare on click", () => {
    render(<AddToCompareButton slug="kingston" />);
    fireEvent.click(screen.getByTestId("add-to-compare"));
    expect(JSON.parse(storage["cf-compare-slugs"])).toContain("kingston");
  });

  it("removes slug from compare on second click", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["kingston"]);
    render(<AddToCompareButton slug="kingston" />);
    fireEvent.click(screen.getByTestId("add-to-compare"));
    expect(JSON.parse(storage["cf-compare-slugs"])).not.toContain("kingston");
  });

  it("shows 'Compare full' and disables when at max capacity with different slug", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["a", "b", "c", "d"]);
    render(<AddToCompareButton slug="kingston" />);
    const btn = screen.getByTestId("add-to-compare");
    expect(btn).toHaveTextContent("Compare full");
    expect(btn).toBeDisabled();
  });

  it("still allows removal when at max and slug IS in list", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["a", "b", "c", "kingston"]);
    render(<AddToCompareButton slug="kingston" />);
    const btn = screen.getByTestId("add-to-compare");
    expect(btn).not.toBeDisabled();
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("calls e.stopPropagation and e.preventDefault on click", () => {
    render(<AddToCompareButton slug="kingston" />);
    const btn = screen.getByTestId("add-to-compare");
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    const stopPropagation = vi.spyOn(event, "stopPropagation");
    const preventDefault = vi.spyOn(event, "preventDefault");
    btn.dispatchEvent(event);
    expect(stopPropagation).toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalled();
  });

  it("removes cf-compare-change listener on unmount", () => {
    const { unmount } = render(<AddToCompareButton slug="kingston" />);
    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith(
      "cf-compare-change",
      expect.any(Function),
    );
  });

  it("re-renders when cf-compare-change fires from another component", () => {
    // Capture the listener registered by useEffect so we can fire it manually.
    let changeListener: (() => void) | null = null;
    (window.addEventListener as ReturnType<typeof vi.fn>).mockImplementation(
      (event: string, fn: () => void) => {
        if (event === "cf-compare-change") changeListener = fn;
      },
    );

    render(<AddToCompareButton slug="kingston" />);

    // Simulate another component writing "kingston" to storage and firing the event.
    storage["cf-compare-slugs"] = JSON.stringify(["kingston"]);
    act(() => changeListener?.());

    expect(screen.getByTestId("add-to-compare")).toHaveTextContent("In compare");
  });
});
