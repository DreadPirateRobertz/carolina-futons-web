// Pure coordinate and layout-state utilities for the 2D room planner.
// No React deps — unit-testable in isolation.

export type PlacedItem = {
  id: string;
  futonIdx: number;
  xIn: number; // inches from room's left wall
  yIn: number; // inches from room's top wall
  rotated: boolean;
};

export type LayoutState = {
  roomWFt: number;
  roomDFt: number;
  items: PlacedItem[];
};

// Pixels-per-inch scale that fits the room inside the canvas with padding.
export function scaleForRoom(
  roomFt: number,
  canvasPx: number,
  paddingPx: number,
): number {
  if (roomFt <= 0) return 0;
  return (canvasPx - paddingPx * 2) / (roomFt * 12);
}

// Convert a canvas-relative pixel offset to room inches.
export function pxToRoomIn(canvasOffsetPx: number, paddingPx: number, scale: number): number {
  if (scale <= 0) return 0;
  return (canvasOffsetPx - paddingPx) / scale;
}

// Convert room inches to a canvas pixel offset.
export function roomInToPx(roomIn: number, paddingPx: number, scale: number): number {
  return paddingPx + roomIn * scale;
}

// Clamp an item position so the item stays fully inside the room bounds.
export function clampItemToRoom(
  xIn: number,
  yIn: number,
  itemWIn: number,
  itemDIn: number,
  roomWIn: number,
  roomDIn: number,
): { xIn: number; yIn: number } {
  return {
    xIn: Math.max(0, Math.min(xIn, Math.max(0, roomWIn - itemWIn))),
    yIn: Math.max(0, Math.min(yIn, Math.max(0, roomDIn - itemDIn))),
  };
}

// Return effective item width and depth accounting for rotation.
export function effectiveDims(
  widthIn: number,
  depthIn: number,
  rotated: boolean,
): { w: number; d: number } {
  return rotated ? { w: depthIn, d: widthIn } : { w: widthIn, d: depthIn };
}

let _seq = 0;
export function makeItemId(): string {
  return `item-${++_seq}`;
}

// Encode layout state to a URL-safe base64 string.
export function encodeLayout(state: LayoutState): string {
  return btoa(
    Array.from(new TextEncoder().encode(JSON.stringify(state)), (b) =>
      String.fromCharCode(b),
    ).join(""),
  );
}

// Decode layout from URL-safe base64. Returns null on invalid input.
export function decodeLayout(encoded: string): LayoutState | null {
  try {
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as LayoutState).roomWFt !== "number" ||
      typeof (parsed as LayoutState).roomDFt !== "number" ||
      !Array.isArray((parsed as LayoutState).items)
    ) {
      return null;
    }
    return parsed as LayoutState;
  } catch {
    return null;
  }
}

// Build the URL with the layout param injected.
export function buildShareUrl(base: string, state: LayoutState): string {
  const url = new URL(base);
  url.searchParams.set("layout", encodeLayout(state));
  return url.toString();
}
