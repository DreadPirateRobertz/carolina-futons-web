import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

// cf-3qt.5.4: page-level rendering tests for /search. SDK calls are mocked
// at the lib layer; the page is a server component so we render the awaited
// JSX. Asserts: guided empty when no q, products + articles two-section
// layout when both populate, no-results state, and the search form preserves
// the current query.

vi.mock("@/lib/wix/products", () => ({
  searchProducts: vi.fn(),
}));
vi.mock("@/lib/wix/blog", () => ({
  searchPosts: vi.fn(),
}));

import { searchProducts } from "@/lib/wix/products";
import { searchPosts } from "@/lib/wix/blog";
import SearchPage from "@/app/search/page";

const mockSearchProducts = vi.mocked(searchProducts);
const mockSearchPosts = vi.mocked(searchPosts);

async function renderSearch(
  params: { q?: string; type?: string } = {},
) {
  const ui = await SearchPage({
    searchParams: Promise.resolve(params),
  });
  return render(ui);
}

beforeEach(() => {
  mockSearchProducts.mockReset();
  mockSearchPosts.mockReset();
});

describe("/search page — guided empty", () => {
  it("renders heading + form + suggestions when no q is supplied", async () => {
    await renderSearch({});
    expect(
      screen.getByRole("heading", { level: 1, name: /search/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("search")).toBeInTheDocument();
    // suggestion chips link back to /search?q=...
    const suggestions = screen.getAllByRole("link");
    expect(suggestions.some((a) => a.getAttribute("href") === "/search?q=futon"))
      .toBe(true);
    expect(mockSearchProducts).not.toHaveBeenCalled();
    expect(mockSearchPosts).not.toHaveBeenCalled();
  });

  it("treats whitespace-only q as no q and skips SDK calls", async () => {
    await renderSearch({ q: "   " });
    expect(
      screen.getByRole("heading", { level: 1, name: /search/i }),
    ).toBeInTheDocument();
    expect(mockSearchProducts).not.toHaveBeenCalled();
    expect(mockSearchPosts).not.toHaveBeenCalled();
  });
});

describe("/search page — results", () => {
  it("renders Products and Articles sections when both populate", async () => {
    mockSearchProducts.mockResolvedValue([
      {
        _id: "p1",
        slug: "monterey-futon",
        name: "Monterey Futon",
        priceData: { formatted: { price: "$899.00" } },
      },
    ] as never);
    mockSearchPosts.mockResolvedValue([
      {
        _id: "post1",
        slug: "futon-care",
        title: "Caring for your futon",
        excerpt: "Keep cotton batting fresh.",
        heroImageUrl: null,
        firstPublishedDate: null,
        minutesToRead: 4,
      },
    ]);

    await renderSearch({ q: "futon" });

    const products = screen.getByRole("region", { name: /products/i });
    expect(within(products).getByText("Monterey Futon")).toBeInTheDocument();
    expect(within(products).getByText("$899.00")).toBeInTheDocument();
    const productLink = within(products).getByRole("link", {
      name: /monterey futon/i,
    });
    expect(productLink.getAttribute("href")).toBe("/products/monterey-futon");

    const articles = screen.getByRole("region", { name: /articles/i });
    expect(within(articles).getByText(/caring for your futon/i)).toBeInTheDocument();
    const postLink = within(articles).getByRole("link", {
      name: /caring for your futon/i,
    });
    expect(postLink.getAttribute("href")).toBe("/blog/futon-care");

    expect(mockSearchProducts).toHaveBeenCalledWith("futon", 12);
    expect(mockSearchPosts).toHaveBeenCalledWith("futon", 8);
  });

  it("renders the no-results state with the search term echoed back", async () => {
    mockSearchProducts.mockResolvedValue([] as never);
    mockSearchPosts.mockResolvedValue([]);
    await renderSearch({ q: "zzznomatch" });
    expect(screen.getByText(/no results for/i)).toBeInTheDocument();
    // No-results section echoes the query inside its dedicated slot
    const noResults = screen.getByText(/we couldn/i).closest("section");
    expect(noResults).not.toBeNull();
    expect(noResults!.textContent).toContain("zzznomatch");
    // Suggestions should still surface to help the user recover
    expect(
      screen.getByRole("link", { name: /futon frames/i }),
    ).toBeInTheDocument();
  });

  it("preserves the current query in the search input so users can refine", async () => {
    mockSearchProducts.mockResolvedValue([] as never);
    mockSearchPosts.mockResolvedValue([]);
    await renderSearch({ q: "mattress" });
    const input = screen.getByRole("searchbox");
    expect(input).toHaveValue("mattress");
  });

  it("hides the Articles section entirely when only products match", async () => {
    mockSearchProducts.mockResolvedValue([
      { _id: "p1", slug: "monterey-futon", name: "Monterey Futon" } as never,
    ]);
    mockSearchPosts.mockResolvedValue([]);
    await renderSearch({ q: "monterey" });
    expect(screen.getByRole("region", { name: /products/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /articles/i }),
    ).not.toBeInTheDocument();
  });

  it("hides the Products section entirely when only articles match", async () => {
    mockSearchProducts.mockResolvedValue([] as never);
    mockSearchPosts.mockResolvedValue([
      {
        _id: "post1",
        slug: "futon-care",
        title: "Caring for your futon",
        excerpt: "",
        heroImageUrl: null,
        firstPublishedDate: null,
        minutesToRead: null,
      },
    ]);
    await renderSearch({ q: "care" });
    expect(screen.getByRole("region", { name: /articles/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /products/i }),
    ).not.toBeInTheDocument();
  });
});

// cf-76a (cf-ruhm.1): type tabs + Pages section. Wix-prod parity ships
// the All/Products/Pages/Blog filter; cfw now wires it server-side.
describe("/search page — type tabs (cf-76a)", () => {
  it("renders 4 filter tabs above results when results exist", async () => {
    mockSearchProducts.mockResolvedValue([
      { _id: "p1", slug: "monterey-futon", name: "Monterey Futon" } as never,
    ]);
    mockSearchPosts.mockResolvedValue([]);
    await renderSearch({ q: "futon" });
    const tabs = screen.getByRole("navigation", {
      name: /filter results by type/i,
    });
    expect(tabs).toBeInTheDocument();
    expect(within(tabs).getByRole("link", { name: /all/i })).toBeInTheDocument();
    expect(within(tabs).getByRole("link", { name: /products/i })).toBeInTheDocument();
    expect(within(tabs).getByRole("link", { name: /pages/i })).toBeInTheDocument();
    expect(within(tabs).getByRole("link", { name: /articles/i })).toBeInTheDocument();
  });

  it("marks the active tab with aria-current=\"page\"", async () => {
    mockSearchProducts.mockResolvedValue([
      { _id: "p1", slug: "monterey-futon", name: "Monterey Futon" } as never,
    ]);
    mockSearchPosts.mockResolvedValue([]);
    await renderSearch({ q: "futon", type: "products" });
    const tabs = screen.getByRole("navigation", {
      name: /filter results by type/i,
    });
    const active = within(tabs).getByRole("link", { name: /products/i });
    expect(active.getAttribute("aria-current")).toBe("page");
    // The other tabs must NOT carry aria-current.
    const inactive = within(tabs).getByRole("link", { name: /all/i });
    expect(inactive.getAttribute("aria-current")).toBeNull();
  });

  it("renders only Products section when type=products", async () => {
    mockSearchProducts.mockResolvedValue([
      { _id: "p1", slug: "monterey-futon", name: "Monterey Futon" } as never,
    ]);
    mockSearchPosts.mockResolvedValue([
      {
        _id: "post1",
        slug: "futon-care",
        title: "Caring for your futon",
        excerpt: "",
        heroImageUrl: null,
        firstPublishedDate: null,
        minutesToRead: null,
      },
    ]);
    await renderSearch({ q: "futon", type: "products" });
    expect(screen.getByRole("region", { name: /products/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /articles/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /^pages$/i }),
    ).not.toBeInTheDocument();
  });

  it("renders only Pages section when type=pages", async () => {
    mockSearchProducts.mockResolvedValue([
      { _id: "p1", slug: "monterey-futon", name: "Monterey Futon" } as never,
    ]);
    mockSearchPosts.mockResolvedValue([]);
    // "warranty" matches /warranty + /returns + /faq in the manifest
    await renderSearch({ q: "warranty", type: "pages" });
    const pages = screen.getByRole("region", { name: /^pages$/i });
    expect(pages).toBeInTheDocument();
    // Multiple manifest entries mention warranty; assert at least the
    // canonical /warranty page is among them.
    const warrantyLinks = within(pages).getAllByRole("link", { name: /warranty/i });
    expect(warrantyLinks.length).toBeGreaterThanOrEqual(1);
    expect(warrantyLinks.some((a) => a.getAttribute("href") === "/warranty")).toBe(true);
    expect(
      screen.queryByRole("region", { name: /products/i }),
    ).not.toBeInTheDocument();
  });

  it("renders only Articles section when type=articles", async () => {
    mockSearchProducts.mockResolvedValue([
      { _id: "p1", slug: "monterey-futon", name: "Monterey Futon" } as never,
    ]);
    mockSearchPosts.mockResolvedValue([
      {
        _id: "post1",
        slug: "futon-care",
        title: "Caring for your futon",
        excerpt: "",
        heroImageUrl: null,
        firstPublishedDate: null,
        minutesToRead: null,
      },
    ]);
    await renderSearch({ q: "futon", type: "articles" });
    expect(screen.getByRole("region", { name: /articles/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /products/i }),
    ).not.toBeInTheDocument();
  });

  it("defaults to type=all on unknown ?type= value (graceful degradation)", async () => {
    mockSearchProducts.mockResolvedValue([
      { _id: "p1", slug: "monterey-futon", name: "Monterey Futon" } as never,
    ]);
    mockSearchPosts.mockResolvedValue([
      {
        _id: "post1",
        slug: "futon-care",
        title: "Caring for your futon",
        excerpt: "",
        heroImageUrl: null,
        firstPublishedDate: null,
        minutesToRead: null,
      },
    ]);
    await renderSearch({ q: "futon", type: "fake-type-value" });
    // Both populated sections show (All view).
    expect(screen.getByRole("region", { name: /products/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /articles/i })).toBeInTheDocument();
  });

  it("shows 'No <type> results' when the active tab is empty (offers 'Try All' link)", async () => {
    mockSearchProducts.mockResolvedValue([] as never);
    mockSearchPosts.mockResolvedValue([
      {
        _id: "post1",
        slug: "futon-care",
        title: "Caring for your futon",
        excerpt: "",
        heroImageUrl: null,
        firstPublishedDate: null,
        minutesToRead: null,
      },
    ]);
    await renderSearch({ q: "futon", type: "products" });
    // Tab strip still visible
    expect(
      screen.getByRole("navigation", { name: /filter results by type/i }),
    ).toBeInTheDocument();
    // No Products region, no Articles region (filtered out by type)
    expect(
      screen.queryByRole("region", { name: /products/i }),
    ).not.toBeInTheDocument();
    // "Try All" recovery link
    expect(screen.getByRole("link", { name: /try all/i })).toBeInTheDocument();
  });

  it("total-result heading is aria-live so screen readers re-announce on each query", async () => {
    mockSearchProducts.mockResolvedValue([
      { _id: "p1", slug: "monterey-futon", name: "Monterey Futon" } as never,
    ]);
    mockSearchPosts.mockResolvedValue([]);
    const { container } = await renderSearch({ q: "futon" });
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live!.textContent).toMatch(/results? for "futon"/);
  });
});
