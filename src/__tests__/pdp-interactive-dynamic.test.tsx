import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// cf-u67q: pin the lazy-load contract so accidental conversions back to
// static imports (e.g. via auto-import) don't silently regress the perf
// fix. Reads the source rather than rendering — the perf property is
// "this module's import graph is split", which only the AST can prove.

const SOURCE = readFileSync(
  resolve(__dirname, "../components/product/PdpInteractive.tsx"),
  "utf8",
);

<<<<<<< HEAD
// cfw-uwg: PdpFinancing was removed from PdpInteractive (no longer rendered
// — the financing surface is now the BnplWidget alone). The component still
// exists at src/components/product/PdpFinancing.tsx for any future caller,
// but it isn't imported here anymore, so the lazy-load assertion against
// PdpInteractive can't apply. Drop it from the list rather than fabricate
// a binding that doesn't exist.
=======
// cf-urg9 removed PdpFinancing entirely — the placeholder section was
// dropped from the buy-box. Drop it from this list so the test stops
// asserting on a component that no longer exists.
>>>>>>> a9f731f (refactor(cfw-3w8): extract owner-mode time formatters to a shared module)
const LAZY_COMPONENTS = [
  "BnplWidget",
  "PdpNotifyMe",
  "PriceLockGuarantee",
] as const;

// PdpStickyCta, PdpFabricSwatches, PdpWhiteGlove intentionally stay STATIC —
// PdpInteractive.test.tsx asserts on their rendered subtree synchronously
// (sticky bar role/name, fabric heading, white-glove region). Converting to
// dynamic would require rewriting those tests to await import resolution,
// which is out of scope for this perf fix.
const EAGER_BELOW_FOLD = [
  "PdpStickyCta",
  "PdpFabricSwatches",
  "PdpWhiteGlove",
] as const;

describe("PdpInteractive — dynamic imports (cf-u67q)", () => {
  it("imports next/dynamic", () => {
    expect(SOURCE).toMatch(/import\s+dynamic\s+from\s+["']next\/dynamic["']/);
  });

  it.each(LAZY_COMPONENTS)(
    "%s is lazy-loaded via next/dynamic, not a static import",
    (component) => {
      // No top-level static import pulling the component into the initial
      // chunk:
      //   import { BnplWidget } from "@/components/product/BnplWidget"
      const staticImport = new RegExp(
        `import\\s*\\{[^}]*\\b${component}\\b[^}]*\\}\\s*from\\s*["']@/components/product/${component}["']`,
      );
      expect(SOURCE).not.toMatch(staticImport);

      // A `const X = dynamic(...)` binding exists with the matching import path
      // somewhere in the file. Two assertions instead of one regex so the
      // diagnostic is precise — matching across the multi-line dynamic()
      // factory body with one regex is fragile.
      expect(SOURCE).toMatch(
        new RegExp(`const\\s+${component}\\s*=\\s*dynamic\\b`),
      );
      expect(SOURCE).toMatch(
        new RegExp(`import\\(["']@/components/product/${component}["']\\)`),
      );
    },
  );

  it("keeps above-the-fold components as static imports", () => {
    // PdpGallery, AddToCartButton, VariantPicker, PdpStockBadge all render
    // in the primary CTA block and need to be present at first paint.
    for (const eager of [
      "PdpGallery",
      "VariantPicker",
      "PdpStockBadge",
      "PdpProductBadges",
      "ProductInventoryBadge",
      "PdpWishlistButton",
      "PdpShippingEstimate",
      "AddToCompareButton",
    ]) {
      expect(SOURCE).toMatch(
        new RegExp(`import\\b[^;]*\\b${eager}\\b[^;]*from`),
      );
    }
  });

  it.each(EAGER_BELOW_FOLD)(
    "%s stays a static import (test-asserted subtree)",
    (component) => {
      // Static import line must exist for these — converting them to
      // dynamic broke the existing PdpInteractive.test.tsx assertions.
      expect(SOURCE).toMatch(
        new RegExp(`import\\b[^;]*\\b${component}\\b[^;]*from`),
      );
      // No dynamic() binding for them.
      expect(SOURCE).not.toMatch(
        new RegExp(`const\\s+${component}\\s*=\\s*dynamic\\b`),
      );
    },
  );
});
