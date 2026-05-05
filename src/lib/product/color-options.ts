// Color-option helpers for product cards.
//
// Wix Stores `productOptions` are typed loosely (option choices carry
// `description`/`value` only — no hex). For PLP card swatches we maintain a
// small name → hex map of the colors actually used in our catalog. Unknown
// names fall back to a neutral gray so the strip still renders without
// guessing colors that mislead shoppers.

import type { WixProduct } from "@/lib/wix/products";

export type ColorChoice = {
  /** Display label, e.g. "Espresso". */
  label: string;
  /** Hex preview color, or `null` when no mapping is available. */
  hex: string | null;
};

// Curated mapping for the colors the catalog actually uses today. Add a row
// when a new color name appears in productOptions; when in doubt err toward a
// neutral, slightly desaturated tone.
const COLOR_NAME_TO_HEX: Record<string, string> = {
  natural: "#D4B896",
  espresso: "#3A2518",
  walnut: "#5C4030",
  oak: "#C8A876",
  black: "#1A1A1A",
  white: "#F5F2EA",
  navy: "#1F2A4A",
  charcoal: "#3F4A55",
  gray: "#8A8E92",
  grey: "#8A8E92",
  beige: "#D9C9A8",
  cream: "#F2E9D2",
  ivory: "#F5EFD9",
  honey: "#C99A56",
  cherry: "#7E2A1F",
};

const FALLBACK_HEX = "#B8B0A4";

export function colorNameToHex(name: string): string {
  return COLOR_NAME_TO_HEX[name.trim().toLowerCase()] ?? FALLBACK_HEX;
}

type RawChoice = {
  description?: string | null;
  value?: string | null;
  inStock?: boolean | null;
};

type RawOption = {
  name?: string | null;
  optionType?: string | null;
  choices?: ReadonlyArray<RawChoice> | null;
};

// Extract the color-typed option's choices from a fully-fetched WixProduct.
// Returns [] when no color option exists, or when the product was loaded via
// `queryProducts` (which omits productOptions per src/lib/wix/products.ts).
export function extractColorChoices(product: WixProduct): ColorChoice[] {
  const options = (product.productOptions ?? []) as ReadonlyArray<RawOption>;
  const colorOption = options.find(
    (opt) => opt?.optionType === "color",
  );
  if (!colorOption?.choices) return [];
  const seen = new Set<string>();
  const result: ColorChoice[] = [];
  for (const choice of colorOption.choices) {
    // `??` falls through on null/undefined only — empty-string description
    // (which appears in real Wix payloads) needs `||` so we fall back to
    // `value` rather than yielding "".
    const label = (choice?.description || choice?.value || "").trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    result.push({ label, hex: colorNameToHex(label) });
  }
  return result;
}
