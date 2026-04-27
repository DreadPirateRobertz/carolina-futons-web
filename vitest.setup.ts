import "@testing-library/jest-dom/vitest";

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
