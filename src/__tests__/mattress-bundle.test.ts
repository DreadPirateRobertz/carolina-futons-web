import { describe, it, expect, vi } from "vitest";

import { isFutonFrame } from "@/lib/product/mattress-bundle";

// cf-h1i4: mattress-bundle utility unit tests

describe("isFutonFrame", () => {
  it("returns true for slugs containing 'futon'", () => {
    expect(isFutonFrame("kingston-futon-frame")).toBe(true);
    expect(isFutonFrame("cambridge-futon-frame")).toBe(true);
    expect(isFutonFrame("my-futon")).toBe(true);
  });

  it("returns false for non-futon slugs", () => {
    expect(isFutonFrame("mesa-1000-mattress")).toBe(false);
    expect(isFutonFrame("kingston-platform-bed")).toBe(false);
    expect(isFutonFrame("murphy-cabinet-bed")).toBe(false);
  });
});
