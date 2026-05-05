import { describe, it, expect } from "vitest";

import {
  colorNameToHex,
  extractColorChoices,
} from "@/lib/product/color-options";
import type { WixProduct } from "@/lib/wix/products";

describe("colorNameToHex", () => {
  it("returns mapped hex for known names case-insensitively", () => {
    expect(colorNameToHex("Espresso")).toBe("#3A2518");
    expect(colorNameToHex("ESPRESSO")).toBe("#3A2518");
    expect(colorNameToHex(" natural ")).toBe("#D4B896");
  });

  it("returns the neutral fallback for unknown names", () => {
    expect(colorNameToHex("Mauve")).toBe("#B8B0A4");
  });

  it("normalizes Gray and Grey to the same hex", () => {
    expect(colorNameToHex("Gray")).toBe(colorNameToHex("Grey"));
  });
});

describe("extractColorChoices", () => {
  function makeProduct(productOptions: unknown): WixProduct {
    return { productOptions } as unknown as WixProduct;
  }

  it("returns [] when productOptions is missing", () => {
    expect(extractColorChoices({} as WixProduct)).toEqual([]);
  });

  it("returns [] when no option has optionType 'color'", () => {
    const product = makeProduct([
      {
        name: "Size",
        optionType: "drop_down",
        choices: [{ description: "Queen", value: "Queen" }],
      },
    ]);
    expect(extractColorChoices(product)).toEqual([]);
  });

  it("extracts choices from the color-typed option with hex previews", () => {
    const product = makeProduct([
      {
        name: "Frame Color",
        optionType: "color",
        choices: [
          { description: "Natural", value: "Natural" },
          { description: "Espresso", value: "Espresso" },
        ],
      },
      {
        name: "Size",
        optionType: "drop_down",
        choices: [{ description: "Queen", value: "Queen" }],
      },
    ]);
    expect(extractColorChoices(product)).toEqual([
      { label: "Natural", hex: "#D4B896" },
      { label: "Espresso", hex: "#3A2518" },
    ]);
  });

  it("falls back to `value` when description is empty", () => {
    const product = makeProduct([
      {
        name: "Color",
        optionType: "color",
        choices: [{ description: "", value: "Walnut" }],
      },
    ]);
    expect(extractColorChoices(product)).toEqual([
      { label: "Walnut", hex: "#5C4030" },
    ]);
  });

  it("dedupes repeated labels", () => {
    const product = makeProduct([
      {
        name: "Color",
        optionType: "color",
        choices: [
          { description: "Natural", value: "Natural" },
          { description: "Natural", value: "Natural" },
        ],
      },
    ]);
    expect(extractColorChoices(product)).toEqual([
      { label: "Natural", hex: "#D4B896" },
    ]);
  });

  it("skips empty/blank choices entirely", () => {
    const product = makeProduct([
      {
        name: "Color",
        optionType: "color",
        choices: [
          { description: "", value: "" },
          { description: "Black", value: "Black" },
        ],
      },
    ]);
    expect(extractColorChoices(product)).toEqual([
      { label: "Black", hex: "#1A1A1A" },
    ]);
  });
});
