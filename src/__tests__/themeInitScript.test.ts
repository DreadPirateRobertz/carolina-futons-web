// cfw-1hj: coverage for src/lib/themeInitScript.ts. The exported
// applyInitialTheme() mirrors the inline string injected into <head>
// pre-paint (THEME_INIT_SCRIPT), so testing one is testing the other —
// the warning at the top of themeInitScript.ts pins them together.
//
// Branches under test:
//   1. localStorage = "dark"                            → adds .dark
//   2. localStorage = "light"                           → no .dark
//   3. localStorage = null + system prefers-dark        → adds .dark
//   4. localStorage = null + system NOT dark            → no .dark
//   5. localStorage throws (SSR / sandbox)              → swallowed, no .dark
//   6. THEME_INIT_SCRIPT string contains STORAGE_KEY    → key drift guard

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { STORAGE_KEY, THEME_INIT_SCRIPT, applyInitialTheme } from "@/lib/themeInitScript";

const getItem = vi.fn<(key: string) => string | null>();

beforeEach(() => {
  getItem.mockReset();
  // jsdom localStorage is a real implementation — stub the getItem only
  // so we can throw on demand for the SSR-sandbox path.
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => getItem(key),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  });
  // Default matchMedia: not dark. Individual tests override.
  vi.stubGlobal("matchMedia", (_query: string) => ({
    matches: false,
    media: _query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }));
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.classList.remove("dark");
});

describe("themeInitScript constants", () => {
  it("STORAGE_KEY is the documented 'cf-theme' value", () => {
    // Multiple consumers (ThemeToggle.tsx + the inline init script) read
    // the same key. Changing STORAGE_KEY without updating both is the
    // exact failure the file warns about — pin it here so a casual rename
    // fails CI, not user devices.
    expect(STORAGE_KEY).toBe("cf-theme");
  });

  it("THEME_INIT_SCRIPT embeds STORAGE_KEY (cross-module key-drift guard)", () => {
    expect(THEME_INIT_SCRIPT).toContain(`'${STORAGE_KEY}'`);
  });

  it("THEME_INIT_SCRIPT is an IIFE wrapping a try/catch (defensive shape)", () => {
    expect(THEME_INIT_SCRIPT).toMatch(/^\(function\(\)\{try\{/);
    expect(THEME_INIT_SCRIPT).toMatch(/\}catch\(e\)\{\}\}\)\(\);$/);
  });
});

describe("applyInitialTheme", () => {
  it("adds .dark when localStorage = 'dark' (explicit user opt-in)", () => {
    getItem.mockReturnValue("dark");

    applyInitialTheme();

    expect(getItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("does NOT add .dark when localStorage = 'light' (explicit user opt-out wins over system)", () => {
    getItem.mockReturnValue("light");
    // Even with system-dark on, an explicit 'light' preference wins.
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      media: "(prefers-color-scheme: dark)",
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }));

    applyInitialTheme();

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("adds .dark when localStorage = null AND matchMedia(prefers-color-scheme: dark) matches", () => {
    getItem.mockReturnValue(null);
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }));

    applyInitialTheme();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("does NOT add .dark when localStorage = null AND system NOT dark", () => {
    getItem.mockReturnValue(null);
    // Default matchMedia stub from beforeEach returns matches=false.

    applyInitialTheme();

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("swallows localStorage exceptions (SSR / sandbox) without throwing or mutating the class list", () => {
    getItem.mockImplementation(() => {
      throw new Error("localStorage is not available (sandbox)");
    });

    expect(() => applyInitialTheme()).not.toThrow();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("idempotent — calling twice with localStorage='dark' leaves a single .dark token", () => {
    getItem.mockReturnValue("dark");

    applyInitialTheme();
    applyInitialTheme();

    // classList.add on an already-present token is a no-op (DOM spec). Pin it
    // so a future refactor that switches to className+= can't sneak in a
    // duplicate token.
    expect(document.documentElement.className.match(/\bdark\b/g)).toHaveLength(1);
  });
});
