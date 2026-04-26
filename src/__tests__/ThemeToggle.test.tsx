import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "@/components/site/ThemeToggle";

// ── matchMedia stub ───────────────────────────────────────────────────────────
function stubMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" ? prefersDark : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

// ── localStorage stub ─────────────────────────────────────────────────────────
function stubStorage(stored: string | null) {
  vi.spyOn(Storage.prototype, "getItem").mockReturnValue(stored);
  vi.spyOn(Storage.prototype, "setItem");
}

beforeEach(() => {
  document.documentElement.classList.remove("dark");
  stubMatchMedia(false);
});

afterEach(() => {
  document.documentElement.classList.remove("dark");
  vi.restoreAllMocks();
});

// ── ThemeToggle component ─────────────────────────────────────────────────────

describe("ThemeToggle", () => {
  it("renders a button with a non-empty accessible label", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
    expect(btn).toBeInTheDocument();
    expect(btn.getAttribute("aria-label")).toBeTruthy();
    expect(btn.getAttribute("aria-label")).toMatch(/toggle/i);
  });

  it("clicking from light mode adds .dark class to <html>", () => {
    document.documentElement.classList.remove("dark");
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("clicking from dark mode removes .dark class from <html>", () => {
    document.documentElement.classList.add("dark");
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("persists 'dark' to localStorage on switch-to-dark", () => {
    vi.spyOn(Storage.prototype, "setItem");
    document.documentElement.classList.remove("dark");
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(localStorage.setItem).toHaveBeenCalledWith("cf-theme", "dark");
  });

  it("persists 'light' to localStorage on switch-to-light", () => {
    vi.spyOn(Storage.prototype, "setItem");
    document.documentElement.classList.add("dark");
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(localStorage.setItem).toHaveBeenCalledWith("cf-theme", "light");
  });

  it("still toggles .dark class when localStorage.setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    document.documentElement.classList.remove("dark");
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    // DOM class is updated despite storage failure
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("renders without error before and after interaction (pre-mount stable)", () => {
    // CSS-driven icons: no JS state → no SSR flicker, no pre-mount blank state
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});

// ── Theme init script logic (tested directly) ─────────────────────────────────

describe("theme init script behaviour", () => {
  // Mirror of THEME_INIT_SCRIPT in src/app/layout.tsx.
  // Keep in sync manually — if production logic drifts, these tests pass
  // but the actual init script behaviour may differ.
  function runInitScript() {
    try {
      const s = localStorage.getItem("cf-theme");
      const d =
        s === "dark" ||
        (s === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
      if (d) document.documentElement.classList.add("dark");
    } catch {}
  }

  beforeEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("sets .dark when localStorage is 'dark'", () => {
    stubMatchMedia(false);
    stubStorage("dark");
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("does not set .dark when localStorage is 'light' (overrides OS preference)", () => {
    stubMatchMedia(true);
    stubStorage("light");
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("falls back to prefers-color-scheme: dark when no stored preference", () => {
    stubMatchMedia(true);
    stubStorage(null);
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("falls back to light when OS is light and no stored preference", () => {
    stubMatchMedia(false);
    stubStorage(null);
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
