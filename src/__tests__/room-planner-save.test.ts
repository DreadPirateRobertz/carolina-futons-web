// cfw-ccc: coverage for src/lib/room-planner/save.ts. localStorage
// persistence layer for the room planner. Three functions, all with
// branching defensive paths: SSR guard, quota / private-mode try/catch,
// decode-fail null. A regression that throws on quota or breaks the
// SSR guard would crash the planner page on Vercel SSR.

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";

import type { LayoutState } from "@/lib/design-a-room/planner-logic";
import {
  ROOM_PLANNER_STORAGE_KEY,
  clearLayout,
  loadLayout,
  saveLayout,
} from "@/lib/room-planner/save";

const SAMPLE: LayoutState = {
  roomWFt: 12,
  roomDFt: 14,
  items: [
    {
      id: "item-1",
      futonIdx: 1,
      xIn: 24,
      yIn: 36,
      rotated: false,
    },
  ],
};

const setItem = vi.fn<(k: string, v: string) => void>();
const getItem = vi.fn<(k: string) => string | null>();
const removeItem = vi.fn<(k: string) => void>();

beforeEach(() => {
  setItem.mockReset();
  getItem.mockReset();
  removeItem.mockReset();

  vi.stubGlobal("localStorage", {
    setItem: (k: string, v: string) => setItem(k, v),
    getItem: (k: string) => getItem(k),
    removeItem: (k: string) => removeItem(k),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ROOM_PLANNER_STORAGE_KEY", () => {
  it("contains the 'v1' version sentinel (so a future v2 schema can side-step stale v1 data)", () => {
    expect(ROOM_PLANNER_STORAGE_KEY).toContain("v1");
  });

  it("is the documented value (regression guard against silent rename)", () => {
    expect(ROOM_PLANNER_STORAGE_KEY).toBe("cf:room-planner:v1");
  });
});

describe("saveLayout", () => {
  it("writes the encoded layout under ROOM_PLANNER_STORAGE_KEY", () => {
    saveLayout(SAMPLE);

    expect(setItem).toHaveBeenCalledTimes(1);
    const [key, value] = setItem.mock.calls[0]!;
    expect(key).toBe(ROOM_PLANNER_STORAGE_KEY);
    // The exact encoding is planner-logic's contract; we just verify a
    // non-empty string actually flowed through.
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });

  it("is a no-op when window is undefined (SSR guard)", () => {
    vi.stubGlobal("window", undefined);

    expect(() => saveLayout(SAMPLE)).not.toThrow();
    expect(setItem).not.toHaveBeenCalled();
  });

  it("swallows localStorage.setItem throws (quota / private-mode)", () => {
    setItem.mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });

    expect(() => saveLayout(SAMPLE)).not.toThrow();
  });
});

describe("loadLayout", () => {
  it("returns null when window is undefined (SSR guard)", () => {
    vi.stubGlobal("window", undefined);

    expect(loadLayout()).toBeNull();
    expect(getItem).not.toHaveBeenCalled();
  });

  it("returns null when nothing is stored (getItem returns null)", () => {
    getItem.mockReturnValue(null);

    expect(loadLayout()).toBeNull();
  });

  it("returns null when localStorage.getItem throws (private-mode)", () => {
    getItem.mockImplementation(() => {
      throw new DOMException("SecurityError", "SecurityError");
    });

    expect(loadLayout()).toBeNull();
  });

  it("returns the decoded LayoutState when stored data is valid", () => {
    // Roundtrip through the real encode → decode pair so we don't
    // hard-code the encoding format here.
    saveLayout(SAMPLE);
    const writtenValue = setItem.mock.calls[0]?.[1] as string;

    getItem.mockReturnValue(writtenValue);

    expect(loadLayout()).toEqual(SAMPLE);
  });

  it("returns null when stored data fails to decode (stale schema)", () => {
    getItem.mockReturnValue("definitely not a valid encoded layout");

    expect(loadLayout()).toBeNull();
  });

  it("returns null on empty-string stored value (treats as 'nothing stored')", () => {
    getItem.mockReturnValue("");

    expect(loadLayout()).toBeNull();
  });
});

describe("clearLayout", () => {
  it("removes the entry under ROOM_PLANNER_STORAGE_KEY", () => {
    clearLayout();

    expect(removeItem).toHaveBeenCalledTimes(1);
    expect(removeItem).toHaveBeenCalledWith(ROOM_PLANNER_STORAGE_KEY);
  });

  it("is a no-op when window is undefined (SSR guard)", () => {
    vi.stubGlobal("window", undefined);

    expect(() => clearLayout()).not.toThrow();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it("swallows removeItem throws (defensive, even though removeItem rarely fails)", () => {
    removeItem.mockImplementation(() => {
      throw new DOMException("SecurityError", "SecurityError");
    });

    expect(() => clearLayout()).not.toThrow();
  });
});

describe("save → load roundtrip", () => {
  it("saved state deep-equals the loaded state", () => {
    saveLayout(SAMPLE);
    const writtenValue = setItem.mock.calls[0]?.[1] as string;

    getItem.mockReturnValue(writtenValue);

    expect(loadLayout()).toEqual(SAMPLE);
  });

  it("clearing then loading returns null", () => {
    saveLayout(SAMPLE);
    const writtenValue = setItem.mock.calls[0]?.[1] as string;

    getItem.mockReturnValue(writtenValue);
    expect(loadLayout()).toEqual(SAMPLE);

    clearLayout();
    // After clear, the next read should miss; we simulate the storage
    // getting cleared by switching the mock's return value.
    getItem.mockReturnValue(null);
    expect(loadLayout()).toBeNull();
  });
});
