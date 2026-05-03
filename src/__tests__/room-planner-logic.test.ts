import { describe, it, expect } from "vitest";
import {
  scaleForRoom,
  pxToRoomIn,
  roomInToPx,
  clampItemToRoom,
  effectiveDims,
  encodeLayout,
  decodeLayout,
  buildShareUrl,
} from "@/lib/design-a-room/planner-logic";
import type { LayoutState } from "@/lib/design-a-room/planner-logic";

const LAYOUT: LayoutState = {
  roomWFt: 12,
  roomDFt: 10,
  items: [
    { id: "item-1", futonIdx: 0, xIn: 6, yIn: 12, rotated: false },
  ],
};

describe("scaleForRoom", () => {
  it("returns pixels-per-inch that fill canvas minus padding", () => {
    // 12ft = 144in, canvas 800px, padding 20px → (800 - 40) / 144
    expect(scaleForRoom(12, 800, 20)).toBeCloseTo(760 / 144);
  });

  it("returns 0 for zero or negative room size", () => {
    expect(scaleForRoom(0, 800, 20)).toBe(0);
    expect(scaleForRoom(-5, 800, 20)).toBe(0);
  });
});

describe("pxToRoomIn / roomInToPx round-trip", () => {
  it("round-trips pixel → inch → pixel", () => {
    const scale = scaleForRoom(12, 800, 20);
    const px = 350;
    const inches = pxToRoomIn(px, 20, scale);
    expect(roomInToPx(inches, 20, scale)).toBeCloseTo(px);
  });

  it("pxToRoomIn returns 0 when scale is 0", () => {
    expect(pxToRoomIn(300, 20, 0)).toBe(0);
  });

  it("padding offset is preserved", () => {
    expect(pxToRoomIn(20, 20, 5)).toBeCloseTo(0);
    expect(roomInToPx(0, 20, 5)).toBe(20);
  });
});

describe("clampItemToRoom", () => {
  it("allows item positioned at origin", () => {
    expect(clampItemToRoom(0, 0, 30, 20, 120, 96)).toEqual({ xIn: 0, yIn: 0 });
  });

  it("clamps negative coordinates to 0", () => {
    expect(clampItemToRoom(-5, -10, 30, 20, 120, 96)).toEqual({ xIn: 0, yIn: 0 });
  });

  it("clamps x so item does not overflow right wall", () => {
    // itemW=30, roomW=120 → max x = 90
    const { xIn } = clampItemToRoom(100, 0, 30, 20, 120, 96);
    expect(xIn).toBe(90);
  });

  it("clamps y so item does not overflow bottom wall", () => {
    // itemD=20, roomD=96 → max y = 76
    const { yIn } = clampItemToRoom(0, 100, 30, 20, 120, 96);
    expect(yIn).toBe(76);
  });

  it("clamps to 0 when item is larger than room", () => {
    const result = clampItemToRoom(5, 5, 200, 200, 100, 100);
    expect(result).toEqual({ xIn: 0, yIn: 0 });
  });
});

describe("effectiveDims", () => {
  it("returns original dims when not rotated", () => {
    expect(effectiveDims(80, 36, false)).toEqual({ w: 80, d: 36 });
  });

  it("swaps w and d when rotated", () => {
    expect(effectiveDims(80, 36, true)).toEqual({ w: 36, d: 80 });
  });
});

describe("encodeLayout / decodeLayout round-trip", () => {
  it("encodes and decodes to equal layout", () => {
    const encoded = encodeLayout(LAYOUT);
    expect(typeof encoded).toBe("string");
    expect(decodeLayout(encoded)).toEqual(LAYOUT);
  });

  it("returns null for empty string", () => {
    expect(decodeLayout("")).toBeNull();
  });

  it("returns null for invalid base64", () => {
    expect(decodeLayout("not-valid!!!")).toBeNull();
  });

  it("returns null for valid base64 that is not a LayoutState", () => {
    const bad = btoa(JSON.stringify({ foo: "bar" }));
    expect(decodeLayout(bad)).toBeNull();
  });

  it("returns null when items is missing", () => {
    const bad = btoa(JSON.stringify({ roomWFt: 10, roomDFt: 8 }));
    expect(decodeLayout(bad)).toBeNull();
  });
});

describe("buildShareUrl", () => {
  it("injects layout param into base URL", () => {
    const url = buildShareUrl("https://example.com/design-a-room", LAYOUT);
    const parsed = new URL(url);
    expect(parsed.searchParams.get("layout")).not.toBeNull();
    expect(decodeLayout(parsed.searchParams.get("layout")!)).toEqual(LAYOUT);
  });

  it("overwrites an existing layout param", () => {
    const base = "https://example.com/design-a-room?layout=old";
    const url = buildShareUrl(base, LAYOUT);
    const params = new URL(url).searchParams.getAll("layout");
    expect(params).toHaveLength(1);
    expect(decodeLayout(params[0])).toEqual(LAYOUT);
  });
});
