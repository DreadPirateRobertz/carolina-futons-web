// cfw-fan: structural invariants for src/lib/design-a-room/room-scenes.ts.
// Three Record/union datasets (ROOM_STYLES, ROOM_STYLE_ORDER,
// SCENE_PRODUCTS) — TypeScript enforces the field-level shape but NOT
// key drift: a stale RoomStyle key in ROOM_STYLE_ORDER (no matching
// ROOM_STYLES entry), an extra SCENE_PRODUCTS row, or a non-hex color
// would all sneak past `tsc --noEmit`.

import { describe, it, expect } from "vitest";

import {
  ROOM_STYLES,
  ROOM_STYLE_ORDER,
  SCENE_PRODUCTS,
  type RoomStyle,
  type SceneProduct,
} from "@/lib/design-a-room/room-scenes";

const STYLES: ReadonlyArray<RoomStyle> = ["modern", "rustic", "minimalist"];
const PRODUCTS: ReadonlyArray<SceneProduct> = ["futon", "murphy", "platform"];

const COLOR_FIELDS: ReadonlyArray<keyof (typeof ROOM_STYLES)[RoomStyle]> = [
  "wallColor",
  "leftWallColor",
  "floorColor",
  "floorStripeColor",
  "productColor",
  "productShade",
  "rugColor",
  "rugBorder",
  "accentColor",
  "plantColor",
];

describe("ROOM_STYLES", () => {
  it("has exactly the 3 RoomStyle keys (modern/rustic/minimalist)", () => {
    expect(Object.keys(ROOM_STYLES).sort()).toEqual([...STYLES].sort());
  });

  it.each(STYLES)("$0 — label is non-empty", (style) => {
    expect(ROOM_STYLES[style].label.trim().length).toBeGreaterThan(0);
  });

  // Cartesian style × color-field matrix — fails fast on the specific
  // (style, field) pair that drifts.
  it.each(
    STYLES.flatMap((style) =>
      COLOR_FIELDS.map((field) => [style, field] as const),
    ),
  )("ROOM_STYLES.%s.%s is a #RRGGBB hex", (style, field) => {
    const value = ROOM_STYLES[style][field];
    expect(value, `${style}.${String(field)} = ${value}`).toMatch(
      /^#[0-9A-Fa-f]{6}$/,
    );
  });
});

describe("ROOM_STYLE_ORDER", () => {
  it("lists exactly the 3 RoomStyle keys (no duplicates, no stragglers)", () => {
    expect([...ROOM_STYLE_ORDER].sort()).toEqual([...STYLES].sort());
  });

  it("every entry has a matching ROOM_STYLES record (no dangling references)", () => {
    for (const s of ROOM_STYLE_ORDER) {
      expect(ROOM_STYLES[s]).toBeDefined();
    }
  });

  it("contains no duplicates", () => {
    expect(new Set(ROOM_STYLE_ORDER).size).toBe(ROOM_STYLE_ORDER.length);
  });
});

describe("SCENE_PRODUCTS", () => {
  it("has exactly the 3 SceneProduct ids (futon/murphy/platform)", () => {
    const ids = SCENE_PRODUCTS.map((p) => p.id);
    expect([...ids].sort()).toEqual([...PRODUCTS].sort());
  });

  it.each(SCENE_PRODUCTS)(
    "$id — label is non-empty",
    (p) => {
      expect(p.label.trim().length).toBeGreaterThan(0);
    },
  );

  it("ids are unique (no duplicate scene-product rendering twice)", () => {
    const ids = SCENE_PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("labels are unique (no two products labelled identically in the picker)", () => {
    const labels = SCENE_PRODUCTS.map((p) => p.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
