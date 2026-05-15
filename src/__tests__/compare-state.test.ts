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

// cf-eqaj: when localStorage rejects a write (private-browsing quota,
// disabled storage, throwing setItem) or the stored value is corrupted
// (parse error), the previously-silent catch swallowed the signal. The
// fix dispatches a `cf-compare-change-error` event on the window so the
// CompareBar (or any future toast / inline-banner consumer) can surface
// feedback to the user instead of pretending the click succeeded.
describe("cf-eqaj — error-event feedback when localStorage is unavailable", () => {
  it("setCompareSlugs dispatches cf-compare-change-error on QuotaExceededError", () => {
    const dispatched: Event[] = [];
    (window.dispatchEvent as ReturnType<typeof vi.fn>).mockImplementation((e: Event) => {
      dispatched.push(e);
      return true;
    });
    const originalSetItem = (window.localStorage as Storage).setItem;
    (window.localStorage as Storage).setItem = vi.fn(() => {
      const err = new Error("Quota exceeded");
      err.name = "QuotaExceededError";
      throw err;
    });

    setCompareSlugs(["kingston"]);

    const errorEvents = dispatched.filter((e) => e.type === "cf-compare-change-error");
    expect(errorEvents).toHaveLength(1);
    const detail = (errorEvents[0] as CustomEvent<{ reason: string }>).detail;
    expect(detail?.reason).toBe("quota-exceeded");

    // Restore so other tests don't see a poisoned mock.
    (window.localStorage as Storage).setItem = originalSetItem;
  });

  it("setCompareSlugs dispatches reason=unavailable when setItem throws non-quota error", () => {
    const dispatched: Event[] = [];
    (window.dispatchEvent as ReturnType<typeof vi.fn>).mockImplementation((e: Event) => {
      dispatched.push(e);
      return true;
    });
    const originalSetItem = (window.localStorage as Storage).setItem;
    (window.localStorage as Storage).setItem = vi.fn(() => {
      throw new Error("localStorage is disabled in this browser context");
    });

    setCompareSlugs(["kingston"]);

    const errorEvents = dispatched.filter((e) => e.type === "cf-compare-change-error");
    expect(errorEvents).toHaveLength(1);
    const detail = (errorEvents[0] as CustomEvent<{ reason: string }>).detail;
    expect(detail?.reason).toBe("unavailable");

    (window.localStorage as Storage).setItem = originalSetItem;
  });

  it("setCompareSlugs does NOT dispatch cf-compare-change on a failed write", () => {
    const dispatched: Event[] = [];
    (window.dispatchEvent as ReturnType<typeof vi.fn>).mockImplementation((e: Event) => {
      dispatched.push(e);
      return true;
    });
    const originalSetItem = (window.localStorage as Storage).setItem;
    (window.localStorage as Storage).setItem = vi.fn(() => {
      throw new Error("Quota exceeded");
    });

    setCompareSlugs(["kingston"]);

    // The success event must NOT fire when persistence failed, otherwise
    // subscribers will read stale state via getCompareSlugs() and report a
    // success state to the user.
    const successEvents = dispatched.filter((e) => e.type === "cf-compare-change");
    expect(successEvents).toHaveLength(0);

    (window.localStorage as Storage).setItem = originalSetItem;
  });

  it("getCompareSlugs dispatches cf-compare-change-error when stored JSON is malformed", () => {
    storage["cf-compare-slugs"] = "{{invalid}}";
    const dispatched: Event[] = [];
    (window.dispatchEvent as ReturnType<typeof vi.fn>).mockImplementation((e: Event) => {
      dispatched.push(e);
      return true;
    });

    const result = getCompareSlugs();

    // Return value still degrades to [] (existing contract).
    expect(result).toEqual([]);
    // But now also signals the parse failure so a watcher can clear the
    // poisoned key + show feedback instead of silently treating it as empty.
    const errorEvents = dispatched.filter((e) => e.type === "cf-compare-change-error");
    expect(errorEvents).toHaveLength(1);
    const detail = (errorEvents[0] as CustomEvent<{ reason: string }>).detail;
    expect(detail?.reason).toBe("parse-error");
  });

  it("happy-path read does not dispatch an error event", () => {
    storage["cf-compare-slugs"] = JSON.stringify(["kingston"]);
    const dispatched: Event[] = [];
    (window.dispatchEvent as ReturnType<typeof vi.fn>).mockImplementation((e: Event) => {
      dispatched.push(e);
      return true;
    });

    getCompareSlugs();

    const errorEvents = dispatched.filter((e) => e.type === "cf-compare-change-error");
    expect(errorEvents).toHaveLength(0);
  });

  it("happy-path write dispatches cf-compare-change but NOT cf-compare-change-error", () => {
    const dispatched: Event[] = [];
    (window.dispatchEvent as ReturnType<typeof vi.fn>).mockImplementation((e: Event) => {
      dispatched.push(e);
      return true;
    });

    setCompareSlugs(["kingston"]);

    expect(dispatched.some((e) => e.type === "cf-compare-change")).toBe(true);
    expect(dispatched.some((e) => e.type === "cf-compare-change-error")).toBe(false);
  });
});
