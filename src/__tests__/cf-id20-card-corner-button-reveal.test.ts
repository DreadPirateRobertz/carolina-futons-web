import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// cf-id20: pin the PLP card-corner button reveal contract so a future
// edit doesn't accidentally make the quick-view + compare buttons
// always-visible on desktop again. Stilgar reported them floating
// over page content during scroll; the fix hides them on fine-pointer
// (mouse) devices until card hover or focus-within. Touch devices
// (pointer: coarse) keep them always-visible — there's no hover
// affordance to surface them otherwise.

const SRC = readFileSync(
  resolve(__dirname, "../components/product/ProductCard.tsx"),
  "utf8",
);

describe("ProductCard corner-button reveal (cf-id20)", () => {
  it("m.div container declares the namespaced `group/card` class", () => {
    // The reveal mechanic depends on group-hover/card + group-focus-within/card
    // resolving to a wrapping element that owns the `group/card` token.
    expect(SRC).toMatch(/group\/card/);
  });

  // Find the JSX wrapper <div ...><AddToCompareButton ... /></div> by
  // scanning for the COMPONENT invocation (with leading `<`) rather than
  // the bare identifier — that excludes import lines + comment refs.
  function wrapperFor(componentTag: string): string {
    const invocationIdx = SRC.indexOf(componentTag);
    if (invocationIdx < 0) return "";
    // Walk back to the nearest preceding `<div` opening tag.
    const prefix = SRC.slice(0, invocationIdx);
    const lastDiv = prefix.lastIndexOf("<div ");
    if (lastDiv < 0) return "";
    return SRC.slice(lastDiv, invocationIdx);
  }

  it("compare button wrapper hides on fine-pointer + reveals on hover/focus-within", () => {
    const block = wrapperFor("<AddToCompareButton ");
    expect(block).toMatch(/pointer-fine:opacity-0/);
    expect(block).toMatch(/pointer-fine:group-hover\/card:opacity-100/);
    expect(block).toMatch(/pointer-fine:group-focus-within\/card:opacity-100/);
  });

  it("quick-view button wrapper hides on fine-pointer + reveals on hover/focus-within", () => {
    const block = wrapperFor("<QuickViewButton ");
    expect(block).toMatch(/pointer-fine:opacity-0/);
    expect(block).toMatch(/pointer-fine:group-hover\/card:opacity-100/);
    expect(block).toMatch(/pointer-fine:group-focus-within\/card:opacity-100/);
  });

  it("does NOT hide buttons globally — touch devices keep them visible", () => {
    // Plain `opacity-0` (no pointer-fine: prefix) would hide on touch too,
    // breaking discoverability on mobile. Pin against an accidental un-
    // prefixed opacity-0 landing on either button wrapper.
    const compareBlock = wrapperFor("<AddToCompareButton ");
    const quickViewBlock = wrapperFor("<QuickViewButton ");
    expect(compareBlock).not.toMatch(/(?<!pointer-fine:)\bopacity-0\b/);
    expect(quickViewBlock).not.toMatch(/(?<!pointer-fine:)\bopacity-0\b/);
  });
});
