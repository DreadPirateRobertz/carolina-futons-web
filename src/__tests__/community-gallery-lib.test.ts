import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));

const listItemsMock = vi.fn();
vi.mock("@/lib/wix/data", () => ({
  listCollectionItems: (...args: unknown[]) => listItemsMock(...args),
}));

const logWixFailureMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/wix/errors", async () => {
  const actual = await vi.importActual<typeof import("@/lib/wix/errors")>("@/lib/wix/errors");
  return { ...actual, logWixFailure: logWixFailureMock };
});

beforeEach(() => {
  listItemsMock.mockReset();
  logWixFailureMock.mockReset();
  logWixFailureMock.mockResolvedValue(undefined);
});

describe("listCommunityPhotos — collection query", () => {
  it("queries the CommunityPhotos collection with default limit 60", async () => {
    listItemsMock.mockResolvedValueOnce([]);
    const { listCommunityPhotos } = await import("@/lib/wix/community-gallery");
    await listCommunityPhotos();
    expect(listItemsMock).toHaveBeenCalledWith("CommunityPhotos", 60);
  });

  it("passes an explicit limit through to listCollectionItems", async () => {
    listItemsMock.mockResolvedValueOnce([]);
    const { listCommunityPhotos } = await import("@/lib/wix/community-gallery");
    await listCommunityPhotos(20);
    expect(listItemsMock).toHaveBeenCalledWith("CommunityPhotos", 20);
  });
});

describe("listCommunityPhotos — mapping", () => {
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
    const { photos } = await listCommunityPhotos();
    expect(photos).toHaveLength(1);
    expect(photos[0]).toMatchObject({
      _id: "abc",
      image: "https://static.wixstatic.com/media/test.jpg",
      customerName: "Jane D.",
      location: "Raleigh, NC",
      productSlug: "mesa-1000",
      caption: "Great futon",
    });
  });

  it("coerces missing string fields to empty string", async () => {
    listItemsMock.mockResolvedValueOnce([
      { _id: "z1", image: "https://static.wixstatic.com/media/ok.jpg" },
    ]);
    const { listCommunityPhotos } = await import("@/lib/wix/community-gallery");
    const { photos } = await listCommunityPhotos();
    expect(photos[0]).toMatchObject({
      customerName: "",
      location: "",
      productSlug: "",
      caption: "",
    });
  });
});

describe("listCommunityPhotos — URL validation", () => {
  it("drops items where image is a wix:image:// URI", async () => {
    listItemsMock.mockResolvedValueOnce([
      { _id: "x1", image: "wix:image://v1/abc.jpg", customerName: "A", location: "B", productSlug: "s", caption: "c" },
      { _id: "x3", image: "https://static.wixstatic.com/media/ok.jpg", customerName: "A", location: "B", productSlug: "s", caption: "c" },
    ]);
    const { listCommunityPhotos } = await import("@/lib/wix/community-gallery");
    const { photos } = await listCommunityPhotos();
    expect(photos).toHaveLength(1);
    expect(photos[0]._id).toBe("x3");
  });

  it("drops items where image is a plain http:// URL", async () => {
    listItemsMock.mockResolvedValueOnce([
      { _id: "h1", image: "http://static.wixstatic.com/media/ok.jpg", customerName: "A", location: "B", productSlug: "s", caption: "c" },
    ]);
    const { listCommunityPhotos } = await import("@/lib/wix/community-gallery");
    const { photos } = await listCommunityPhotos();
    expect(photos).toHaveLength(0);
  });

  it("drops items where image is null", async () => {
    listItemsMock.mockResolvedValueOnce([
      { _id: "x2", image: null, customerName: "A", location: "B", productSlug: "s", caption: "c" },
    ]);
    const { listCommunityPhotos } = await import("@/lib/wix/community-gallery");
    const { photos } = await listCommunityPhotos();
    expect(photos).toHaveLength(0);
  });

  it("drops items with null _id", async () => {
    listItemsMock.mockResolvedValueOnce([
      { _id: null, image: "https://static.wixstatic.com/media/ok.jpg", customerName: "A", location: "B", productSlug: "s", caption: "c" },
    ]);
    const { listCommunityPhotos } = await import("@/lib/wix/community-gallery");
    const { photos } = await listCommunityPhotos();
    expect(photos).toHaveLength(0);
  });

  it("drops items with empty-string _id", async () => {
    listItemsMock.mockResolvedValueOnce([
      { _id: "", image: "https://static.wixstatic.com/media/ok.jpg", customerName: "A", location: "B", productSlug: "s", caption: "c" },
    ]);
    const { listCommunityPhotos } = await import("@/lib/wix/community-gallery");
    const { photos } = await listCommunityPhotos();
    expect(photos).toHaveLength(0);
  });
});

describe("listCommunityPhotos — error handling", () => {
  it("returns { photos: [], error: 'wix_sdk' } on Wix SDK error", async () => {
    // Wix SDK errors have a `code` field
    const wixErr = Object.assign(new Error("STORE_UNAVAILABLE"), { code: "STORE_UNAVAILABLE" });
    listItemsMock.mockRejectedValueOnce(wixErr);
    const { listCommunityPhotos } = await import("@/lib/wix/community-gallery");
    const result = await listCommunityPhotos();
    expect(result).toEqual({ photos: [], error: "wix_sdk" });
  });

  it("calls logWixFailure with source 'wix' on Wix SDK error", async () => {
    const wixErr = Object.assign(new Error("STORE_UNAVAILABLE"), { code: "STORE_UNAVAILABLE" });
    listItemsMock.mockRejectedValueOnce(wixErr);
    const { listCommunityPhotos } = await import("@/lib/wix/community-gallery");
    await listCommunityPhotos();
    expect(logWixFailureMock).toHaveBeenCalledWith("wix", "listCommunityPhotos", wixErr);
  });

  it("re-throws non-Wix errors so programmer bugs surface to the error boundary", async () => {
    listItemsMock.mockRejectedValueOnce(new TypeError("cannot read property of undefined"));
    const { listCommunityPhotos } = await import("@/lib/wix/community-gallery");
    await expect(listCommunityPhotos()).rejects.toThrow(TypeError);
  });

  it("returns { photos } with no error field on success", async () => {
    listItemsMock.mockResolvedValueOnce([]);
    const { listCommunityPhotos } = await import("@/lib/wix/community-gallery");
    const result = await listCommunityPhotos();
    expect(result.error).toBeUndefined();
    expect(result.photos).toEqual([]);
  });
});
