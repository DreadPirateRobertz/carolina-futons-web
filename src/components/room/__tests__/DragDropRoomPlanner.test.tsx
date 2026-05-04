import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";

// cf-l6aj.15: DragDropRoomPlanner unit tests.
// (1) renders — data-slot attributes present
// (2) drag handler — ProductPalette tile dragStart sets effectAllowed="copy"
// (3) localStorage roundtrip — encodeLayout+decodeLayout preserves LayoutState

vi.mock("@/lib/room-planner/save", () => ({
  loadLayout: vi.fn(() => null),
  saveLayout: vi.fn(),
  clearLayout: vi.fn(),
  ROOM_PLANNER_STORAGE_KEY: "cf:room-planner:v1",
}));

import { DragDropRoomPlanner } from "../DragDropRoomPlanner";
import {
  encodeLayout,
  decodeLayout,
  type LayoutState,
} from "@/lib/design-a-room/planner-logic";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DragDropRoomPlanner — renders", () => {
  it("mounts with data-slot=drag-drop-room-planner and data-slot=room-canvas", () => {
    render(<DragDropRoomPlanner />);
    expect(document.querySelector('[data-slot="drag-drop-room-planner"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="room-canvas"]')).not.toBeNull();
  });
});

describe("DragDropRoomPlanner — palette drag handler", () => {
  it("sets dataTransfer.effectAllowed=copy when a palette tile dragStarts", () => {
    render(<DragDropRoomPlanner />);

    const palette = document.querySelector('[data-slot="product-palette"]');
    expect(palette).not.toBeNull();

    const tile = palette!.querySelector("[draggable]") as HTMLElement;
    expect(tile).not.toBeNull();

    const dt = { effectAllowed: "" } as DataTransfer;
    fireEvent.dragStart(tile, { dataTransfer: dt });

    expect(dt.effectAllowed).toBe("copy");
  });
});

describe("planner-logic localStorage encode/decode roundtrip", () => {
  it("encodeLayout and decodeLayout preserve a LayoutState exactly", () => {
    const state: LayoutState = {
      roomWFt: 14,
      roomDFt: 11,
      items: [
        { id: "item-1", futonIdx: 0, xIn: 24, yIn: 12, rotated: false },
        { id: "item-2", futonIdx: 2, xIn: 60, yIn: 36, rotated: true },
      ],
    };

    const encoded = encodeLayout(state);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodeLayout(encoded);
    expect(decoded).toEqual(state);
  });
});
