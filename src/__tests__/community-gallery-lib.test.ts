import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));

const listItemsMock = vi.fn();
vi.mock("@/lib/wix/data", () => ({
  listCollectionItems: (...args: unknown[]) => listItemsMock(...args),
}));

beforeEach(() => {
  listItemsMock.mockReset();
});

describe("listCommunityPhotos", () => {
  it("queries the CommunityPhotos collection", async () => {
    listItemsMock.mockResolvedValueOnce([]);
    const { listCommunityPhotos } = await import("@/lib/wix/community-gallery");
    await listCommunityPhotos();
    expect(listItemsMock).toHaveBeenCalledWith("CommunityPhotos", expect.any(Number));
  });

  it("maps raw items to CommunityPhoto shape", async () => {
    listItemsMock.mockResolvedValueOnce([
      {
        _id: "abc",
        image: "https://static.wixstatic.com/media/test.jpg",
        customerName: "Jane D.",
        location: "Raleigh, NC",
        productSlug: "mesa-1000",
        caption: "Great futon",
      },
    ]);
    const { listCommunityPhotos } = await import("@/lib/wix/community-gallery");
    const result = await listCommunityPhotos();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      _id: "abc",
      image: "https://static.wixstatic.com/media/test.jpg",
      customerName: "Jane D.",
      location: "Raleigh, NC",
      productSlug: "mesa-1000",
      caption: "Great futon",
    });
  });

  it("drops items where image is not an https URL", async () => {
    listItemsMock.mockResolvedValueOnce([
      { _id: "x1", image: "wix:image://v1/abc.jpg", customerName: "A", location: "B", productSlug: "s", caption: "c" },
      { _id: "x2", image: null, customerName: "A", location: "B", productSlug: "s", caption: "c" },
      { _id: "x3", image: "https://static.wixstatic.com/media/ok.jpg", customerName: "A", location: "B", productSlug: "s", caption: "c" },
    ]);
    const { listCommunityPhotos } = await import("@/lib/wix/community-gallery");
    const result = await listCommunityPhotos();
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("x3");
  });

  it("drops items with no _id", async () => {
    listItemsMock.mockResolvedValueOnce([
      { _id: null, image: "https://static.wixstatic.com/media/ok.jpg", customerName: "A", location: "B", productSlug: "s", caption: "c" },
    ]);
    const { listCommunityPhotos } = await import("@/lib/wix/community-gallery");
    const result = await listCommunityPhotos();
    expect(result).toHaveLength(0);
  });

  it("returns [] on SDK error without rethrowing", async () => {
    listItemsMock.mockRejectedValueOnce(new Error("network failure"));
    const { listCommunityPhotos } = await import("@/lib/wix/community-gallery");
    const result = await listCommunityPhotos();
    expect(result).toEqual([]);
  });

  it("coerces missing string fields to empty string", async () => {
    listItemsMock.mockResolvedValueOnce([
      { _id: "z1", image: "https://static.wixstatic.com/media/ok.jpg" },
    ]);
    const { listCommunityPhotos } = await import("@/lib/wix/community-gallery");
    const result = await listCommunityPhotos();
    expect(result[0]).toMatchObject({
      customerName: "",
      location: "",
      productSlug: "",
      caption: "",
    });
  });
});
