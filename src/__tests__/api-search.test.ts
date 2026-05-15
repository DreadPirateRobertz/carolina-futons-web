import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// cf-3qt.5.4: behavioral tests for GET /api/search. Mocks the Wix lib layer
// directly — the route's job is shape, not SDK fidelity. Wix client failures
// are exercised via the lib-level mocks returning [], which mirrors how
// searchProducts/searchPosts swallow SDK errors in production.

vi.mock("@/lib/wix/products", () => ({
  searchProducts: vi.fn(),
}));
vi.mock("@/lib/wix/blog", () => ({
  searchPosts: vi.fn(),
}));

import { searchProducts } from "@/lib/wix/products";
import { searchPosts } from "@/lib/wix/blog";
import { GET } from "@/app/api/search/route";

const mockSearchProducts = vi.mocked(searchProducts);
const mockSearchPosts = vi.mocked(searchPosts);

function makeReq(qs: string) {
  return new NextRequest(
    `https://carolinafutons.com/api/search${qs ? `?${qs}` : ""}`,
  );
}

beforeEach(() => {
  mockSearchProducts.mockReset();
  mockSearchPosts.mockReset();
});

describe("GET /api/search", () => {
  it("returns an empty result with ok=true when q is missing — never short-circuits to 400", async () => {
    const res = await GET(makeReq(""));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      ok: true,
      q: "",
      products: [],
      posts: [],
      total: 0,
      productsTotal: 0,
      postsTotal: 0,
    });
    expect(mockSearchProducts).not.toHaveBeenCalled();
    expect(mockSearchPosts).not.toHaveBeenCalled();
  });

  it("returns empty for whitespace-only q without hitting Wix", async () => {
    const res = await GET(makeReq("q=%20%20%20"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.q).toBe("");
    expect(mockSearchProducts).not.toHaveBeenCalled();
    expect(mockSearchPosts).not.toHaveBeenCalled();
  });

  it("queries products and posts in parallel for a real q and returns shaped JSON", async () => {
    mockSearchProducts.mockResolvedValue({
      items: [
        {
          _id: "p1",
          slug: "monterey-futon",
          name: "Monterey Futon",
          priceData: { formatted: { price: "$899.00" } },
          media: { mainMedia: { image: { url: "https://cdn/x.jpg" } } },
        },
      ] as never,
      total: 1,
    });
    mockSearchPosts.mockResolvedValue({
      items: [
        {
          _id: "post1",
          slug: "futon-care",
          title: "Caring for your futon",
          excerpt: "How to keep cotton batting fresh.",
          heroImageUrl: null,
          firstPublishedDate: null,
          minutesToRead: 4,
        },
      ],
      total: 1,
    });

    const res = await GET(makeReq("q=futon"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.q).toBe("futon");
    expect(json.products).toEqual([
      {
        id: "p1",
        slug: "monterey-futon",
        name: "Monterey Futon",
        priceFormatted: "$899.00",
        imageUrl: "https://cdn/x.jpg",
      },
    ]);
    expect(json.posts).toEqual([
      {
        id: "post1",
        slug: "futon-care",
        title: "Caring for your futon",
        excerpt: "How to keep cotton batting fresh.",
      },
    ]);
    expect(json.total).toBe(2);
  });

  it("trims whitespace before passing the query to lib helpers", async () => {
    mockSearchProducts.mockResolvedValue({ items: [], total: 0 });
    mockSearchPosts.mockResolvedValue({ items: [], total: 0 });
    await GET(makeReq("q=%20%20mattress%20care%20%20"));
    expect(mockSearchProducts).toHaveBeenCalledWith("mattress care", {
      pageSize: 12,
    });
    expect(mockSearchPosts).toHaveBeenCalledWith("mattress care", {
      pageSize: 8,
    });
  });

  it("returns total=0 when both sources return empty", async () => {
    mockSearchProducts.mockResolvedValue({ items: [], total: 0 });
    mockSearchPosts.mockResolvedValue({ items: [], total: 0 });
    const res = await GET(makeReq("q=zzznomatch"));
    const json = await res.json();
    expect(json.total).toBe(0);
    expect(json.productsTotal).toBe(0);
    expect(json.postsTotal).toBe(0);
    expect(json.products).toEqual([]);
    expect(json.posts).toEqual([]);
  });

  it("surfaces per-type totals (cf-94l productsTotal + postsTotal)", async () => {
    mockSearchProducts.mockResolvedValue({
      items: [{ _id: "p1", slug: "x", name: "X" } as never],
      total: 41,
    });
    mockSearchPosts.mockResolvedValue({ items: [], total: 3 });
    const res = await GET(makeReq("q=futon"));
    const json = await res.json();
    expect(json.productsTotal).toBe(41);
    expect(json.postsTotal).toBe(3);
    // Surface total is the sum.
    expect(json.total).toBe(44);
  });

  it("normalizes missing product price/image fields to null", async () => {
    mockSearchProducts.mockResolvedValue({
      items: [{ _id: "p1", slug: "x", name: "X" } as never],
      total: 1,
    });
    mockSearchPosts.mockResolvedValue({ items: [], total: 0 });
    const res = await GET(makeReq("q=x"));
    const json = await res.json();
    expect(json.products[0]).toEqual({
      id: "p1",
      slug: "x",
      name: "X",
      priceFormatted: null,
      imageUrl: null,
    });
  });
});
