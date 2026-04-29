import { describe, it, expect } from "vitest";
import {
  checkRoomFit,
  convertDimensions,
  type ProductDimensions,
} from "@/lib/product/size-guide";

const BASE_DIMS: ProductDimensions = {
  productId: "prod-1",
  unit: "in",
  closed: { width: 80, depth: 34, height: 34 },
  open: { width: 80, depth: 86, height: 17 },
  seatHeight: 18,
  weight: 140,
  mattressSize: "Full",
  shipping: null,
};

// ── convertDimensions ────────────────────────────────────────────────────────

describe("convertDimensions", () => {
  it("returns the same object when unit already matches", () => {
    const result = convertDimensions(BASE_DIMS, "in");
    expect(result).toBe(BASE_DIMS);
  });

  it("converts inches to centimeters (80in = 203.2cm)", () => {
    const cm = convertDimensions(BASE_DIMS, "cm");
    expect(cm.unit).toBe("cm");
    expect(cm.closed.width).toBe(203.2);
  });

  it("converts open depth correctly (86in = 218.4cm)", () => {
    const cm = convertDimensions(BASE_DIMS, "cm");
    expect(cm.open.depth).toBe(218.4);
  });

  it("converts seat height", () => {
    const cm = convertDimensions(BASE_DIMS, "cm");
    expect(cm.seatHeight).toBe(45.7); // 18 * 2.54 = 45.72 → 45.7
  });

  it("does not mutate the original dims", () => {
    convertDimensions(BASE_DIMS, "cm");
    expect(BASE_DIMS.unit).toBe("in");
  });

  it("converts shipping dimensions when present", () => {
    const withShipping: ProductDimensions = {
      ...BASE_DIMS,
      shipping: { width: 84, depth: 12, height: 12, weight: 150 },
    };
    const cm = convertDimensions(withShipping, "cm");
    expect(cm.shipping?.width).toBe(213.4); // 84 * 2.54
  });

  it("keeps shipping weight unchanged (weight is lbs, not a length)", () => {
    const withShipping: ProductDimensions = {
      ...BASE_DIMS,
      shipping: { width: 84, depth: 12, height: 12, weight: 150 },
    };
    const cm = convertDimensions(withShipping, "cm");
    expect(cm.shipping?.weight).toBe(150);
  });
});

// ── checkRoomFit ─────────────────────────────────────────────────────────────

describe("checkRoomFit", () => {
  it("returns 'fits' for a generously sized room", () => {
    const result = checkRoomFit(BASE_DIMS, 200, 200);
    expect(result.verdict).toBe("fits");
  });

  it("returns 'no-fit' when room is smaller than open product", () => {
    // open: 80W × 86D — room 70×70 is too small
    const result = checkRoomFit(BASE_DIMS, 70, 70);
    expect(result.verdict).toBe("no-fit");
  });

  it("returns 'tight' when clearance is between 0 and 24 inches", () => {
    // open: 80W × 86D — room 100×100 gives 20" and 14" clearance
    const result = checkRoomFit(BASE_DIMS, 100, 100);
    expect(result.verdict).toBe("tight");
  });

  it("returns 'unknown' when open dimensions are null", () => {
    const noDims: ProductDimensions = {
      ...BASE_DIMS,
      open: { width: null, depth: null, height: null },
    };
    const result = checkRoomFit(noDims, 200, 200);
    expect(result.verdict).toBe("unknown");
  });

  it("passes through open width and depth in the result", () => {
    const result = checkRoomFit(BASE_DIMS, 200, 200);
    expect(result.openWidthIn).toBe(80);
    expect(result.openDepthIn).toBe(86);
  });

  it("passes through the input room dimensions in the result", () => {
    const result = checkRoomFit(BASE_DIMS, 144, 168);
    expect(result.roomWidthIn).toBe(144);
    expect(result.roomDepthIn).toBe(168);
  });

  it("works correctly with cm dims by converting to inches first", () => {
    const cmDims = convertDimensions(BASE_DIMS, "cm");
    // cm version should produce same verdict for equivalent room size
    // 200in × 200in ≈ 508cm × 508cm
    const inResult = checkRoomFit(BASE_DIMS, 200, 200);
    const cmResult = checkRoomFit(cmDims, 200, 200);
    expect(cmResult.verdict).toBe(inResult.verdict);
  });

  it("returns a non-empty message for every verdict type", () => {
    const fits = checkRoomFit(BASE_DIMS, 200, 200);
    const tight = checkRoomFit(BASE_DIMS, 100, 100);
    const noFit = checkRoomFit(BASE_DIMS, 70, 70);
    expect(fits.message.length).toBeGreaterThan(0);
    expect(tight.message.length).toBeGreaterThan(0);
    expect(noFit.message.length).toBeGreaterThan(0);
  });
});
