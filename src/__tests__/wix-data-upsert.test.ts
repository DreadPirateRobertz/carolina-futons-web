// cfw-6qd.3: upsertCollectionItemByKey — query-by-business-key + items.save()
// pattern used by the SiteContent admin write endpoint. Verifies the helper
// passes existing _id on update and omits it on insert.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSave = vi.fn();
const mockFind = vi.fn();
const mockEq = vi.fn(() => ({ limit: () => ({ find: mockFind }) }));
const mockQuery = vi.fn(() => ({ eq: mockEq }));

const fakeClient = {
  items: {
    query: mockQuery,
    save: mockSave,
  },
};

vi.mock("@/lib/wix-client", () => ({
  getWixClient: () => fakeClient,
  getWixClientWithTokens: vi.fn(() => fakeClient),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("upsertCollectionItemByKey", () => {
  it("inserts when no existing item matches the keyField", async () => {
    mockFind.mockResolvedValueOnce({ items: [] });
    mockSave.mockResolvedValueOnce({
      _id: "row-new",
      key: "footer.tagline",
      value: "Hi",
    });

    const { upsertCollectionItemByKey } = await import("@/lib/wix/data");
    const result = await upsertCollectionItemByKey({
      collectionId: "SiteContent",
      keyField: "key",
      keyValue: "footer.tagline",
      fields: { value: "Hi" },
    });

    expect(mockQuery).toHaveBeenCalledWith("SiteContent");
    expect(mockEq).toHaveBeenCalledWith("key", "footer.tagline");
    expect(mockSave).toHaveBeenCalledWith("SiteContent", {
      key: "footer.tagline",
      value: "Hi",
    });
    expect(result).toEqual({
      _id: "row-new",
      key: "footer.tagline",
      value: "Hi",
    });
  });

  it("passes existing _id when an item with the keyField already exists", async () => {
    mockFind.mockResolvedValueOnce({
      items: [{ _id: "row-existing", key: "footer.tagline", value: "Old" }],
    });
    mockSave.mockResolvedValueOnce({
      _id: "row-existing",
      key: "footer.tagline",
      value: "New",
    });

    const { upsertCollectionItemByKey } = await import("@/lib/wix/data");
    await upsertCollectionItemByKey({
      collectionId: "SiteContent",
      keyField: "key",
      keyValue: "footer.tagline",
      fields: { value: "New" },
    });

    expect(mockSave).toHaveBeenCalledWith("SiteContent", {
      _id: "row-existing",
      key: "footer.tagline",
      value: "New",
    });
  });

  it("uses the tokened client when tokens are passed", async () => {
    mockFind.mockResolvedValueOnce({ items: [] });
    mockSave.mockResolvedValueOnce({});

    const tokens = {
      accessToken: { value: "acc", expiresAt: 0 },
      refreshToken: { value: "ref", role: 0 },
    } as unknown as import("@wix/sdk").Tokens;

    const wixClient = await import("@/lib/wix-client");
    const { upsertCollectionItemByKey } = await import("@/lib/wix/data");

    await upsertCollectionItemByKey({
      collectionId: "SiteContent",
      keyField: "key",
      keyValue: "x",
      fields: { value: "y" },
      tokens,
    });

    expect(wixClient.getWixClientWithTokens).toHaveBeenCalledWith(tokens);
  });
});
