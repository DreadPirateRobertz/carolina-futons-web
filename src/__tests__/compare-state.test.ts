import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock localStorage before importing the module so SSR guard is bypassed.
const storage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = v; },
  removeItem: (k: string) => { delete storage[k]; },
});

// Stub window.dispatchEvent so cf-compare-change doesn't throw in Node.
vi.stubGlobal("dispatchEvent", vi.fn());

import {
  buildCompareUrl,
  getCompareSlugs,
  setCompareSlugs,
  toggleCompareSlug,
} from "@/lib/product/compare-state";

beforeEach(() => {
  Object.keys(storage).forEach((k) => delete storage[k]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("getCompareSlugs", () => {
  it("returns [] when storage is empty", () => {
    expect(getCompareSlugs()).toEqual([]);
  });

  it("parses a stored slug array", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["kingston", "blue-ridge"]);
    expect(getCompareSlugs()).toEqual(["kingston", "blue-ridge"]);
  });

  it("caps at COMPARE_MAX (4)", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["a", "b", "c", "d", "e"]);
    expect(getCompareSlugs()).toHaveLength(4);
  });

  it("ignores non-string entries", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["a", 42, null, "b"]);
    expect(getCompareSlugs()).toEqual(["a", "b"]);
  });

  it("returns [] for malformed JSON", () => {
    storage["cf-compare-slugs"] = "{{invalid}}";
    expect(getCompareSlugs()).toEqual([]);
  });
});

describe("setCompareSlugs", () => {
  it("persists slugs to localStorage", () => {
    setCompareSlugs(["kingston"]);
    expect(JSON.parse(storage["cf-compare-slugs"])).toEqual(["kingston"]);
  });

  it("caps persisted array at COMPARE_MAX", () => {
    setCompareSlugs(["a", "b", "c", "d", "e"]);
    expect(JSON.parse(storage["cf-compare-slugs"])).toHaveLength(4);
  });

  it("dispatches cf-compare-change event", () => {
    setCompareSlugs(["x"]);
    expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
    const [evt] = (window.dispatchEvent as ReturnType<typeof vi.fn>).mock.calls[0] as [Event];
    expect(evt.type).toBe("cf-compare-change");
  });
});

describe("toggleCompareSlug", () => {
  it("adds a slug that is not present", () => {
    expect(toggleCompareSlug("kingston")).toContain("kingston");
  });

  it("removes a slug that is already present", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["kingston", "blue-ridge"]);
    expect(toggleCompareSlug("kingston")).not.toContain("kingston");
  });

  it("does not exceed COMPARE_MAX when adding", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["a", "b", "c", "d"]);
    const result = toggleCompareSlug("e");
    expect(result).toHaveLength(4);
    expect(result).not.toContain("e");
  });
});

describe("buildCompareUrl", () => {
  it("returns /compare?slugs= with comma-joined list", () => {
    expect(buildCompareUrl(["kingston", "blue-ridge"])).toBe(
      "/compare?slugs=kingston,blue-ridge",
    );
  });
});
