// Unit tests for gift registry localStorage storage layer (cf-l6aj.16).

import { describe, it, expect, beforeEach } from "vitest";
import {
  REGISTRY_STORAGE_KEY,
  readRegistries,
  createRegistry,
  deleteRegistry,
  getRegistry,
} from "@/lib/registry/registry-storage";

function makeStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  } as Storage;
}

let storage: Storage;

beforeEach(() => {
  storage = makeStorage();
});

describe("readRegistries", () => {
  it("returns [] when storage is empty", () => {
    expect(readRegistries(storage)).toEqual([]);
  });

  it("returns [] and does not throw on corrupted JSON", () => {
    storage.setItem(REGISTRY_STORAGE_KEY, "not-json{{{");
    expect(readRegistries(storage)).toEqual([]);
  });

  it("drops malformed entries but keeps valid ones", () => {
    storage.setItem(
      REGISTRY_STORAGE_KEY,
      JSON.stringify([
        { _id: "good", title: "My Registry", slug: "my-registry", occasion: "wedding", isPublic: true, items: [] },
        { title: "Missing _id" },
        null,
      ]),
    );
    const result = readRegistries(storage);
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("good");
  });
});

describe("createRegistry", () => {
  it("creates a registry with a unique _id and persists it", () => {
    const reg = createRegistry(storage, {
      title: "Beach House Warmup",
      occasion: "housewarming",
      eventDate: "2026-08-01",
      isPublic: true,
    });
    expect(reg._id).toBeTruthy();
    expect(reg.title).toBe("Beach House Warmup");
    expect(reg.occasion).toBe("housewarming");
    expect(reg.items).toEqual([]);

    const stored = readRegistries(storage);
    expect(stored).toHaveLength(1);
    expect(stored[0]._id).toBe(reg._id);
  });

  it("prepends new registry to front of list", () => {
    const first = createRegistry(storage, { title: "First", occasion: "wedding", eventDate: null, isPublic: true });
    const second = createRegistry(storage, { title: "Second", occasion: "dorm", eventDate: null, isPublic: false });
    const stored = readRegistries(storage);
    expect(stored[0]._id).toBe(second._id);
    expect(stored[1]._id).toBe(first._id);
  });
});

describe("getRegistry", () => {
  it("returns null for unknown id", () => {
    expect(getRegistry(storage, "no-such-id")).toBeNull();
  });

  it("returns the registry by id after creation", () => {
    const reg = createRegistry(storage, { title: "Find Me", occasion: "baby", eventDate: null, isPublic: true });
    const found = getRegistry(storage, reg._id);
    expect(found).not.toBeNull();
    expect(found!._id).toBe(reg._id);
    expect(found!.title).toBe("Find Me");
  });
});

describe("deleteRegistry", () => {
  it("removes the registry with the given id", () => {
    const a = createRegistry(storage, { title: "A", occasion: "wedding", eventDate: null, isPublic: true });
    const b = createRegistry(storage, { title: "B", occasion: "holiday", eventDate: null, isPublic: false });
    deleteRegistry(storage, a._id);
    const remaining = readRegistries(storage);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]._id).toBe(b._id);
  });
});

describe("writeRegistries / readRegistries round-trip", () => {
  it("serialises and deserialises a registry without data loss", () => {
    const reg = createRegistry(storage, {
      title: "Round-trip Test",
      occasion: "other",
      eventDate: "2026-12-25",
      message: "Hello guests",
      isPublic: true,
    });
    const [loaded] = readRegistries(storage);
    expect(loaded.title).toBe("Round-trip Test");
    expect(loaded.occasion).toBe("other");
    expect(loaded.eventDate).toBe("2026-12-25");
    expect(loaded.message).toBe("Hello guests");
    expect(loaded.isPublic).toBe(true);
    expect(loaded._id).toBe(reg._id);
  });
});
