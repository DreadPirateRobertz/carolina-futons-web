import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockListCollectionItems = vi.fn();
vi.mock("@/lib/wix/data", () => ({
  listCollectionItems: (...args: unknown[]) => mockListCollectionItems(...args),
}));

import { listFabricSwatches } from "@/lib/wix/fabrics";

beforeEach(() => {
  mockListCollectionItems.mockReset();
});

describe("listFabricSwatches", () => {
  it("queries the FabricSwatches collection with limit 200", async () => {
    mockListCollectionItems.mockResolvedValue([]);
    await listFabricSwatches();
    expect(mockListCollectionItems).toHaveBeenCalledWith("FabricSwatches", 200);
  });

  it("returns an empty array when collection is empty", async () => {
    mockListCollectionItems.mockResolvedValue([]);
    const result = await listFabricSwatches();
    expect(result).toEqual([]);
  });

  it("sorts by sortOrder ascending", async () => {
    mockListCollectionItems.mockResolvedValue([
      { _id: "c", swatchName: "Charlie", sortOrder: 3 },
      { _id: "a", swatchName: "Alpha", sortOrder: 1 },
      { _id: "b", swatchName: "Bravo", sortOrder: 2 },
    ]);
    const result = await listFabricSwatches();
    expect(result.map((s) => s._id)).toEqual(["a", "b", "c"]);
  });

  it("treats missing sortOrder as 0", async () => {
    mockListCollectionItems.mockResolvedValue([
      { _id: "b", swatchName: "Bravo", sortOrder: 1 },
      { _id: "a", swatchName: "Alpha" },
    ]);
    const result = await listFabricSwatches();
    expect(result[0]._id).toBe("a");
    expect(result[1]._id).toBe("b");
  });

  it("passes through colorFamily and colorHex", async () => {
    mockListCollectionItems.mockResolvedValue([
      { _id: "s1", swatchName: "Navy", colorFamily: "Blue", colorHex: "#000080" },
    ]);
    const [swatch] = await listFabricSwatches();
    expect(swatch.colorFamily).toBe("Blue");
    expect(swatch.colorHex).toBe("#000080");
  });

  it("filters out rows missing _id", async () => {
    mockListCollectionItems.mockResolvedValue([
      { _id: "ok", swatchName: "Good" },
      { swatchName: "Bad — no id" },
    ]);
    const result = await listFabricSwatches();
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("ok");
  });

  it("filters out rows missing swatchName", async () => {
    mockListCollectionItems.mockResolvedValue([
      { _id: "ok", swatchName: "Good" },
      { _id: "bad" },
    ]);
    const result = await listFabricSwatches();
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("ok");
  });

  it("filters out rows missing both _id and swatchName", async () => {
    mockListCollectionItems.mockResolvedValue([
      { _id: "ok", swatchName: "Good" },
      { colorFamily: "Orphan" },
    ]);
    const result = await listFabricSwatches();
    expect(result).toHaveLength(1);
  });

  it("does not include sortOrder in returned SwatchItem", async () => {
    mockListCollectionItems.mockResolvedValue([
      { _id: "s1", swatchName: "Alpha", sortOrder: 5 },
    ]);
    const [swatch] = await listFabricSwatches();
    expect(Object.keys(swatch)).not.toContain("sortOrder");
  });
});
