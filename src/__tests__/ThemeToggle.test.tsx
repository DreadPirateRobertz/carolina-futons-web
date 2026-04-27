import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import {
  STORAGE_KEY,
  THEME_INIT_SCRIPT,
  applyInitialTheme,
} from "@/lib/themeInitScript";

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
  vi.spyOn(Storage.prototype, "setItem");
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
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, "dark");
  });

  it("persists 'light' to localStorage on switch-to-light", () => {
    document.documentElement.classList.add("dark");
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, "light");
  });

  it("still toggles .dark class when localStorage.setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("renders without error before and after interaction (pre-mount stable)", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});

// ── Theme init script logic ───────────────────────────────────────────────────

describe("theme init script behaviour", () => {
  it("THEME_INIT_SCRIPT embeds the correct storage key", () => {
    // Guards against STORAGE_KEY and the inline script drifting apart.
    expect(THEME_INIT_SCRIPT).toContain(`'${STORAGE_KEY}'`);
  });

  it("sets .dark when localStorage is 'dark'", () => {
    stubMatchMedia(false);
    stubStorage("dark");
    applyInitialTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("does not set .dark when localStorage is 'light' (overrides OS preference)", () => {
    stubMatchMedia(true);
    stubStorage("light");
    applyInitialTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("falls back to prefers-color-scheme: dark when no stored preference", () => {
    stubMatchMedia(true);
    stubStorage(null);
    applyInitialTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("falls back to light when OS is light and no stored preference", () => {
    stubMatchMedia(false);
    stubStorage(null);
    applyInitialTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
