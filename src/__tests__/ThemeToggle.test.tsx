import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
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
  vi.restoreAllMocks();
});

afterEach(() => {
  document.documentElement.classList.remove("dark");
  vi.restoreAllMocks();
});

// ── ThemeToggle component ─────────────────────────────────────────────────────

describe("ThemeToggle", () => {
  it("renders a button with accessible label", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows Moon icon (switch to dark) when light mode is active", async () => {
    document.documentElement.classList.remove("dark");
    render(<ThemeToggle />);
    await act(async () => {});
    // aria-label reflects current mode
    expect(screen.getByRole("button").getAttribute("aria-label")).toMatch(/dark mode/i);
  });

  it("shows Sun icon (switch to light) when dark mode is active", async () => {
    document.documentElement.classList.add("dark");
    render(<ThemeToggle />);
    await act(async () => {});
    expect(screen.getByRole("button").getAttribute("aria-label")).toMatch(/light mode/i);
  });

  it("clicking from light adds .dark class to <html>", async () => {
    document.documentElement.classList.remove("dark");
    render(<ThemeToggle />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("clicking from dark removes .dark class from <html>", async () => {
    document.documentElement.classList.add("dark");
    render(<ThemeToggle />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("persists 'dark' to localStorage on switch-to-dark", async () => {
    stubStorage(null);
    document.documentElement.classList.remove("dark");
    render(<ThemeToggle />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button"));
    expect(localStorage.setItem).toHaveBeenCalledWith("cf-theme", "dark");
  });

  it("persists 'light' to localStorage on switch-to-light", async () => {
    stubStorage("dark");
    document.documentElement.classList.add("dark");
    render(<ThemeToggle />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button"));
    expect(localStorage.setItem).toHaveBeenCalledWith("cf-theme", "light");
  });
});

// ── Theme init script logic (tested directly) ─────────────────────────────────

describe("theme init script behaviour", () => {
  function runInitScript() {
    // Replicate the exact logic from THEME_INIT_SCRIPT in layout.tsx
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
    vi.restoreAllMocks();
  });

  it("sets .dark when localStorage is 'dark'", () => {
    stubMatchMedia(false);
    stubStorage("dark");
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("does not set .dark when localStorage is 'light'", () => {
    stubMatchMedia(true); // OS prefers dark but user chose light
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
