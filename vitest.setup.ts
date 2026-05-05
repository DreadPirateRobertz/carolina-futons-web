import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

// cfw-7so: CartProvider now reads/writes a localStorage snapshot, so without
// a per-test reset the cart state bleeds across tests (e.g. "1 item" assertion
// fails because the previous test's "1 item" hydrates and then a new addLine
// merges to qty 2). Clear all browser storage between tests so each test
// starts with a clean slate. Cheap (jsdom is in-memory) and prevents a class
// of order-dependent failures that would otherwise need per-file beforeEach.
beforeEach(() => {
  if (typeof window === "undefined") return;
  // Some tests stub localStorage with a partial mock that lacks .clear() —
  // fall back silently so the global reset never breaks those suites.
  try {
    window.localStorage.clear?.();
  } catch {
    /* stubbed localStorage may throw on .clear() — leave it alone */
  }
  try {
    window.sessionStorage.clear?.();
  } catch {
    /* same */
  }
});

// jsdom does not implement matchMedia. Provide a silent stub so any component
// that calls window.matchMedia (e.g. MagneticButton, ProductSpinViewer) works
// in tests without per-file mocking.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
