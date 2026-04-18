import { describe, it, expect } from "vitest";

import {
  RECENTLY_VIEWED_MAX,
  RECENTLY_VIEWED_STORAGE_KEY,
  pushRecentlyViewed,
  readRecentlyViewed,
  writeRecentlyViewed,
  type RecentlyViewedItem,
} from "@/lib/product/recently-viewed";

function mk(id: string, overrides: Partial<RecentlyViewedItem> = {}): RecentlyViewedItem {
  return {
    id,
    slug: `${id}-slug`,
    name: `Product ${id}`,
    imageUrl: `https://img.example/${id}.jpg`,
    priceText: "$199",
    viewedAt: 0,
    ...overrides,
  };
}

function memStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    key: (i) => Array.from(store.keys())[i] ?? null,
    removeItem: (k) => void store.delete(k),
    setItem: (k, v) => void store.set(k, v),
  };
}

describe("pushRecentlyViewed (ring buffer)", () => {
  it("prepends a new item to an empty list", () => {
    const next = pushRecentlyViewed([], mk("a"));
    expect(next.map((i) => i.id)).toEqual(["a"]);
  });

  it("keeps most-recent-first ordering", () => {
    let list: RecentlyViewedItem[] = [];
    list = pushRecentlyViewed(list, mk("a"));
    list = pushRecentlyViewed(list, mk("b"));
    list = pushRecentlyViewed(list, mk("c"));
    expect(list.map((i) => i.id)).toEqual(["c", "b", "a"]);
  });

  it("evicts the oldest entry when the buffer exceeds RECENTLY_VIEWED_MAX", () => {
    // cf-3qt.7.N.1 test (1): ring-buffer eviction at 6+. Pushing 7 unique ids
    // should keep the 6 most recent and drop the very first.
    let list: RecentlyViewedItem[] = [];
    for (const id of ["a", "b", "c", "d", "e", "f", "g"]) {
      list = pushRecentlyViewed(list, mk(id));
    }
    expect(list.length).toBe(RECENTLY_VIEWED_MAX);
    expect(list.map((i) => i.id)).toEqual(["g", "f", "e", "d", "c", "b"]);
    expect(list.find((i) => i.id === "a")).toBeUndefined();
  });

  it("re-visiting an id promotes it to most-recent (no duplicates)", () => {
    // Otherwise a user bouncing between A and B would fill the buffer with
    // alternating duplicates and evict unrelated products.
    let list: RecentlyViewedItem[] = [];
    list = pushRecentlyViewed(list, mk("a"));
    list = pushRecentlyViewed(list, mk("b"));
    list = pushRecentlyViewed(list, mk("c"));
    list = pushRecentlyViewed(list, mk("a")); // re-visit
    expect(list.map((i) => i.id)).toEqual(["a", "c", "b"]);
    expect(list.filter((i) => i.id === "a").length).toBe(1);
  });
});

describe("readRecentlyViewed", () => {
  it("returns [] when storage is null (SSR path)", () => {
    // cf-3qt.7.N.1 test (4): SSR must not touch localStorage. The helper is
    // callable with null and returns an empty array so the client wrapper
    // never has to branch on typeof window.
    expect(readRecentlyViewed(null)).toEqual([]);
    expect(readRecentlyViewed(undefined)).toEqual([]);
  });

  it("returns [] when the key is missing", () => {
    expect(readRecentlyViewed(memStorage())).toEqual([]);
  });

  it("returns [] when the stored blob is not valid JSON", () => {
    const s = memStorage({ [RECENTLY_VIEWED_STORAGE_KEY]: "{not json" });
    expect(readRecentlyViewed(s)).toEqual([]);
  });

  it("returns [] when the stored blob is JSON but not an array", () => {
    const s = memStorage({ [RECENTLY_VIEWED_STORAGE_KEY]: JSON.stringify({}) });
    expect(readRecentlyViewed(s)).toEqual([]);
  });

  it("drops entries that don't satisfy the schema (forward-compat with rev-N data)", () => {
    const blob = JSON.stringify([
      mk("a"),
      { id: 123, slug: "nope", name: "n", viewedAt: 0 }, // id not string
      mk("b"),
      { id: "c", slug: "c-slug" }, // missing required fields
    ]);
    const s = memStorage({ [RECENTLY_VIEWED_STORAGE_KEY]: blob });
    expect(readRecentlyViewed(s).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("tolerates a getItem that throws (Safari private mode)", () => {
    const throwing: Pick<Storage, "getItem"> = {
      getItem: () => {
        throw new Error("SecurityError");
      },
    };
    expect(readRecentlyViewed(throwing)).toEqual([]);
  });

  it("caps the returned list at RECENTLY_VIEWED_MAX even if storage somehow has more", () => {
    const overflow = Array.from({ length: 10 }, (_, i) => mk(String(i)));
    const s = memStorage({
      [RECENTLY_VIEWED_STORAGE_KEY]: JSON.stringify(overflow),
    });
    expect(readRecentlyViewed(s).length).toBe(RECENTLY_VIEWED_MAX);
  });
});

describe("writeRecentlyViewed", () => {
  it("is a no-op when storage is null", () => {
    expect(() => writeRecentlyViewed(null, [mk("a")])).not.toThrow();
  });

  it("persists the JSON-serialized list under the correct key", () => {
    const s = memStorage();
    writeRecentlyViewed(s, [mk("a"), mk("b")]);
    const roundtrip = JSON.parse(s.getItem(RECENTLY_VIEWED_STORAGE_KEY) ?? "[]");
    expect(roundtrip.map((i: RecentlyViewedItem) => i.id)).toEqual(["a", "b"]);
  });

  it("swallows quota-exceeded errors so a full localStorage can't break the PDP", () => {
    const throwing: Pick<Storage, "setItem"> = {
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => writeRecentlyViewed(throwing, [mk("a")])).not.toThrow();
  });
});
