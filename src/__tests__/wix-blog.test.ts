import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// cf-l11g: unit tests for src/lib/wix/blog.ts. Mock the Wix client + the
// shared logWixFailure (so failures don't go to Sentry in unit context) and
// drive listPosts / listAllPostSlugs / getPostBySlug across success, empty,
// malformed-row, and SDK-throws paths.

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));

const queryPosts = vi.fn();
const getPostBySlug = vi.fn();
vi.mock("@/lib/wix-client", () => ({
  getWixClient: () => ({
    posts: {
      queryPosts,
      getPostBySlug,
    },
  }),
}));

const logWixFailure = vi.fn();
vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: (...args: unknown[]) => logWixFailure(...args),
}));

import * as blog from "@/lib/wix/blog";

function builderReturning(items: unknown[]) {
  const find = vi.fn().mockResolvedValue({ items });
  const limit = vi.fn().mockReturnValue({ find });
  return { limit, find };
}

beforeEach(() => {
  queryPosts.mockReset();
  getPostBySlug.mockReset();
  logWixFailure.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("listPosts", () => {
  it("returns mapped summaries for every well-formed row", async () => {
    const items = [
      {
        _id: "p1",
        slug: "futon-vs-sofa-bed",
        title: "Futon vs sofa bed",
        excerpt: "Which one to buy.",
        heroImage: { url: "https://img/futon.jpg" },
        firstPublishedDate: "2026-04-20T12:00:00.000Z",
        minutesToRead: 4,
      },
      {
        _id: "p2",
        slug: "wool-care",
        title: "Wool mattress care",
        excerpt: "How to air it.",
        heroImage: "https://img/wool.jpg", // string variant of heroImage
        firstPublishedDate: new Date("2026-04-22T10:00:00.000Z"),
        minutesToRead: 6,
      },
    ];
    queryPosts.mockReturnValue(builderReturning(items));

    const posts = await blog.listPosts(12);

    expect(posts).toHaveLength(2);
    expect(posts[0]).toMatchObject({
      _id: "p1",
      slug: "futon-vs-sofa-bed",
      title: "Futon vs sofa bed",
      excerpt: "Which one to buy.",
      heroImageUrl: "https://img/futon.jpg",
      minutesToRead: 4,
    });
    expect(posts[0].firstPublishedDate).toBeInstanceOf(Date);
    expect(posts[1].heroImageUrl).toBe("https://img/wool.jpg");
  });

  it("filters out rows with missing slug or _id", async () => {
    const items = [
      { _id: "ok", slug: "ok", title: "Keep" },
      { _id: "no-slug", slug: "", title: "Drop" },
      { slug: "no-id", title: "Drop" },
      { _id: "ws", slug: "   ", title: "Drop whitespace-only slug" },
    ];
    queryPosts.mockReturnValue(builderReturning(items));

    const posts = await blog.listPosts();

    expect(posts.map((p) => p.slug)).toEqual(["ok"]);
  });

  it("returns [] and logs when the SDK throws", async () => {
    queryPosts.mockImplementation(() => {
      throw new Error("Wix down");
    });

    const posts = await blog.listPosts();

    expect(posts).toEqual([]);
    expect(logWixFailure).toHaveBeenCalledWith(
      "wix",
      "listPosts",
      expect.any(Error),
    );
  });

  it("forwards the limit argument to .limit()", async () => {
    const builder = builderReturning([]);
    queryPosts.mockReturnValue(builder);

    await blog.listPosts(7);

    expect(builder.limit).toHaveBeenCalledWith(7);
  });
});

describe("listAllPostSlugs", () => {
  it("returns trimmed non-empty slugs", async () => {
    queryPosts.mockReturnValue(
      builderReturning([
        { _id: "1", slug: "one" },
        { _id: "2", slug: "  two  " },
        { _id: "3", slug: "" },
        { _id: "4" },
      ]),
    );

    const slugs = await blog.listAllPostSlugs();

    expect(slugs).toEqual(["one", "two"]);
  });

  it("returns [] and logs on SDK error", async () => {
    queryPosts.mockImplementation(() => {
      throw new Error("boom");
    });

    const slugs = await blog.listAllPostSlugs();

    expect(slugs).toEqual([]);
    expect(logWixFailure).toHaveBeenCalledWith(
      "wix",
      "listAllPostSlugs",
      expect.any(Error),
    );
  });
});

describe("getPostBySlug", () => {
  it("returns the post body when found", async () => {
    getPostBySlug.mockResolvedValueOnce({
      post: {
        _id: "p1",
        slug: "futon-vs-sofa-bed",
        title: "Futon vs sofa bed",
        excerpt: "Which one to buy.",
        contentText: "First para.\n\nSecond para.",
        heroImage: { url: "https://img/futon.jpg" },
        firstPublishedDate: "2026-04-20T12:00:00.000Z",
        minutesToRead: 4,
      },
    });

    const post = await blog.getPostBySlug("futon-vs-sofa-bed");

    expect(post).not.toBeNull();
    expect(post!.title).toBe("Futon vs sofa bed");
    expect(post!.contentText).toContain("First para.");
    expect(post!.heroImageUrl).toBe("https://img/futon.jpg");
  });

  it("returns null for an empty slug without calling the SDK", async () => {
    const post = await blog.getPostBySlug("");
    expect(post).toBeNull();
    expect(getPostBySlug).not.toHaveBeenCalled();
  });

  it("returns null when the SDK responds with an empty envelope", async () => {
    getPostBySlug.mockResolvedValueOnce({ post: null });
    const post = await blog.getPostBySlug("missing");
    expect(post).toBeNull();
  });

  it("returns null and logs when the SDK throws", async () => {
    getPostBySlug.mockRejectedValueOnce(new Error("404 from Wix"));
    const post = await blog.getPostBySlug("crashy");
    expect(post).toBeNull();
    expect(logWixFailure).toHaveBeenCalledWith(
      "wix",
      "getPostBySlug(crashy)",
      expect.any(Error),
    );
  });

  it("requests RICH_CONTENT + CONTENT_TEXT + URL + SEO fieldsets", async () => {
    getPostBySlug.mockResolvedValueOnce({ post: null });
    await blog.getPostBySlug("any");
    expect(getPostBySlug).toHaveBeenCalledWith(
      "any",
      expect.objectContaining({
        fieldsets: expect.arrayContaining([
          "URL",
          "CONTENT_TEXT",
          "RICH_CONTENT",
          "SEO",
        ]),
      }),
    );
  });
});

// cf-wvgk: static fallback tests — when Wix Blog returns empty, use static posts
describe("listPosts — static fallback", () => {
  it("falls back to static posts when Wix Blog returns empty array", async () => {
    queryPosts.mockReturnValue(builderReturning([]));
    const posts = await blog.listPosts();
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.some((p) => p.slug === "futon-vs-sofa-bed")).toBe(true);
  });

  it("does not fall back when Wix Blog returns posts", async () => {
    queryPosts.mockReturnValue(
      builderReturning([{ _id: "x1", slug: "live-post", title: "Live" }]),
    );
    const posts = await blog.listPosts();
    expect(posts.map((p) => p.slug)).toEqual(["live-post"]);
  });
});

describe("getPostBySlug — static fallback", () => {
  it("falls back to static post when Wix Blog throws", async () => {
    getPostBySlug.mockRejectedValueOnce(new Error("Wix Blog not installed"));
    const post = await blog.getPostBySlug("futon-vs-sofa-bed");
    expect(post).not.toBeNull();
    expect(post!.slug).toBe("futon-vs-sofa-bed");
  });

  it("falls back to static post when Wix Blog returns null", async () => {
    getPostBySlug.mockResolvedValueOnce({ post: null });
    const post = await blog.getPostBySlug("futon-frame-buying-guide");
    expect(post).not.toBeNull();
    expect(post!.slug).toBe("futon-frame-buying-guide");
  });

  it("returns null for a slug not in static posts after Wix miss", async () => {
    getPostBySlug.mockResolvedValueOnce({ post: null });
    const post = await blog.getPostBySlug("totally-unknown-slug");
    expect(post).toBeNull();
  });
});
