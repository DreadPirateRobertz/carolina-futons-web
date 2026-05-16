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

// cf-94l: helpers to construct the new { items, total } shape returned
// by searchProducts/searchPosts. `total` defaults to `items.length` so
// tests that don't care about "more results exist than rendered" don't
// have to specify it; pass an explicit total to exercise pagination
// affordances like the "Showing 1–12 of 41" header.
function productResults(
  items: unknown[],
  total: number = items.length,
): never {
  return { items, total } as never;
}
function postResults<T>(items: T[], total: number = items.length) {
  return { items, total };
}

async function renderSearch(
  params: { q?: string; type?: string; page?: string } = {},
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
    mockSearchProducts.mockResolvedValue(productResults([
      {
        _id: "p1",
        slug: "monterey-futon",
        name: "Monterey Futon",
        priceData: { formatted: { price: "$899.00" } },
      },
    ]));
    mockSearchPosts.mockResolvedValue(postResults([
      {
        _id: "post1",
        slug: "futon-care",
        title: "Caring for your futon",
        excerpt: "Keep cotton batting fresh.",
        heroImageUrl: null,
        firstPublishedDate: null,
        minutesToRead: 4,
      },
    ]));

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

    // cf-94l: paginated call signature — page=1, pageSize=12 for All view.
    expect(mockSearchProducts).toHaveBeenCalledWith("futon", { page: 1, pageSize: 12 });
    expect(mockSearchPosts).toHaveBeenCalledWith("futon", { page: 1, pageSize: 12 });
  });

  it("renders the no-results state with the search term echoed back", async () => {
    mockSearchProducts.mockResolvedValue(productResults([]));
    mockSearchPosts.mockResolvedValue(postResults([]));
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
    mockSearchProducts.mockResolvedValue(productResults([]));
    mockSearchPosts.mockResolvedValue(postResults([]));
    await renderSearch({ q: "mattress" });
    const input = screen.getByRole("searchbox");
    expect(input).toHaveValue("mattress");
  });

  it("hides the Articles section entirely when only products match", async () => {
    mockSearchProducts.mockResolvedValue(productResults([{ _id: "p1", slug: "monterey-futon", name: "Monterey Futon" }]));
    mockSearchPosts.mockResolvedValue(postResults([]));
    await renderSearch({ q: "monterey" });
    expect(screen.getByRole("region", { name: /products/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /articles/i }),
    ).not.toBeInTheDocument();
  });

  it("hides the Products section entirely when only articles match", async () => {
    mockSearchProducts.mockResolvedValue(productResults([]));
    mockSearchPosts.mockResolvedValue(postResults([
      {
        _id: "post1",
        slug: "futon-care",
        title: "Caring for your futon",
        excerpt: "",
        heroImageUrl: null,
        firstPublishedDate: null,
        minutesToRead: null,
      },
    ]));
    await renderSearch({ q: "care" });
    expect(screen.getByRole("region", { name: /articles/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /products/i }),
    ).not.toBeInTheDocument();
  });

  // cf-33a (cf-ruhm.4): QuickView button on every product result row so
  // shoppers can open the variant picker + add-to-cart without a PDP click.
  it("renders a QuickView button on every product result row (cf-33a)", async () => {
    mockSearchProducts.mockResolvedValue({
      items: [
        {
          _id: "p1",
          slug: "monterey-futon",
          name: "Monterey Futon",
          priceData: { formatted: { price: "$899.00" } },
        },
        {
          _id: "p2",
          slug: "asheville-daybed",
          name: "Asheville Daybed",
          priceData: { formatted: { price: "$799.00" } },
        },
      ],
      total: 2,
    } as never);
    mockSearchPosts.mockResolvedValue({ items: [], total: 0 });
    await renderSearch({ q: "f" });

    const monterey = screen.getByRole("button", {
      name: /quick view: monterey futon/i,
    });
    const asheville = screen.getByRole("button", {
      name: /quick view: asheville daybed/i,
    });
    expect(monterey).toBeInTheDocument();
    expect(asheville).toBeInTheDocument();
    // Buttons must NOT be wrapped in the PDP <Link> (nested-anchor would
    // be invalid HTML and block QuickView's click before opening the
    // modal). They live as siblings inside the <li>.
    expect(monterey.closest("a")).toBeNull();
    expect(asheville.closest("a")).toBeNull();
  });

  it("skips the QuickView button when a result is missing a slug (cf-33a defensive)", async () => {
    mockSearchProducts.mockResolvedValue({
      items: [
        // No slug field — QuickView needs slug to fetch product detail.
        { _id: "p1", name: "Slugless Frame", priceData: { formatted: { price: "$0.00" } } },
      ],
      total: 1,
    } as never);
    mockSearchPosts.mockResolvedValue({ items: [], total: 0 });
    await renderSearch({ q: "frame" });
    expect(
      screen.queryByRole("button", { name: /quick view: slugless frame/i }),
    ).toBeNull();
    // The product still shows by name; just no QuickView affordance.
    expect(screen.getByText("Slugless Frame")).toBeInTheDocument();
  });
});

// cf-76a (cf-ruhm.1): type tabs + Pages section. Wix-prod parity ships
// the All/Products/Pages/Blog filter; cfw now wires it server-side.
describe("/search page — type tabs (cf-76a)", () => {
  it("renders 4 filter tabs above results when results exist", async () => {
    mockSearchProducts.mockResolvedValue(productResults([{ _id: "p1", slug: "monterey-futon", name: "Monterey Futon" }]));
    mockSearchPosts.mockResolvedValue(postResults([]));
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
    mockSearchProducts.mockResolvedValue(productResults([{ _id: "p1", slug: "monterey-futon", name: "Monterey Futon" }]));
    mockSearchPosts.mockResolvedValue(postResults([]));
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
    mockSearchProducts.mockResolvedValue(productResults([{ _id: "p1", slug: "monterey-futon", name: "Monterey Futon" }]));
    mockSearchPosts.mockResolvedValue(postResults([
      {
        _id: "post1",
        slug: "futon-care",
        title: "Caring for your futon",
        excerpt: "",
        heroImageUrl: null,
        firstPublishedDate: null,
        minutesToRead: null,
      },
    ]));
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
    mockSearchProducts.mockResolvedValue(productResults([{ _id: "p1", slug: "monterey-futon", name: "Monterey Futon" }]));
    mockSearchPosts.mockResolvedValue(postResults([]));
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
    mockSearchProducts.mockResolvedValue(productResults([{ _id: "p1", slug: "monterey-futon", name: "Monterey Futon" }]));
    mockSearchPosts.mockResolvedValue(postResults([
      {
        _id: "post1",
        slug: "futon-care",
        title: "Caring for your futon",
        excerpt: "",
        heroImageUrl: null,
        firstPublishedDate: null,
        minutesToRead: null,
      },
    ]));
    await renderSearch({ q: "futon", type: "articles" });
    expect(screen.getByRole("region", { name: /articles/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /products/i }),
    ).not.toBeInTheDocument();
  });

  it("defaults to type=all on unknown ?type= value (graceful degradation)", async () => {
    mockSearchProducts.mockResolvedValue(productResults([{ _id: "p1", slug: "monterey-futon", name: "Monterey Futon" }]));
    mockSearchPosts.mockResolvedValue(postResults([
      {
        _id: "post1",
        slug: "futon-care",
        title: "Caring for your futon",
        excerpt: "",
        heroImageUrl: null,
        firstPublishedDate: null,
        minutesToRead: null,
      },
    ]));
    await renderSearch({ q: "futon", type: "fake-type-value" });
    // Both populated sections show (All view).
    expect(screen.getByRole("region", { name: /products/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /articles/i })).toBeInTheDocument();
  });

  it("shows 'No <type> results' when the active tab is empty (offers 'Try All' link)", async () => {
    mockSearchProducts.mockResolvedValue(productResults([]));
    mockSearchPosts.mockResolvedValue(postResults([
      {
        _id: "post1",
        slug: "futon-care",
        title: "Caring for your futon",
        excerpt: "",
        heroImageUrl: null,
        firstPublishedDate: null,
        minutesToRead: null,
      },
    ]));
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
    mockSearchProducts.mockResolvedValue(productResults([{ _id: "p1", slug: "monterey-futon", name: "Monterey Futon" }]));
    mockSearchPosts.mockResolvedValue(postResults([]));
    const { container } = await renderSearch({ q: "futon" });
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live!.textContent).toMatch(/results? for "futon"/);
  });

  it("total-result heading carries role=\"status\" for Wix-prod a11y parity (cf-uoe)", async () => {
    mockSearchProducts.mockResolvedValue(
      productResults([{ _id: "p1", slug: "monterey-futon", name: "Monterey Futon" }]),
    );
    mockSearchPosts.mockResolvedValue(postResults([]));
    await renderSearch({ q: "futon" });
    // getByRole picks up role="status"; expect the search-results heading.
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(status.textContent).toMatch(/results? for "futon"/);
    // role="status" must NOT clobber the explicit aria-live + aria-atomic
    // (specifying both is intentional — see cf-uoe WHY comment).
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.getAttribute("aria-atomic")).toBe("true");
  });
});

// cf-94l (cf-ruhm.2): pagination + total count display. Wix prod shows
// "41 results found for 'futon'" with pagination; cfw now mirrors the
// header format ("Showing 1–12 of 41 for 'futon'.") and a per-tab prev/
// next footer.
describe("/search page — pagination + total count (cf-94l)", () => {
  it("All view header surfaces the total count without the 'Showing X–Y of' phrasing", async () => {
    // total > items.length to confirm the All view uses the simple total.
    mockSearchProducts.mockResolvedValue(
      productResults(
        [{ _id: "p1", slug: "monterey-futon", name: "Monterey Futon" }],
        41,
      ),
    );
    mockSearchPosts.mockResolvedValue(postResults([], 3));
    await renderSearch({ q: "futon" });
    // All view shows just the total ("N results for 'futon'.") format —
    // the exact count depends on PAGES manifest matches (not mocked),
    // so assert the format pattern rather than a specific number.
    // What matters: NOT the "Showing X–Y of" phrasing reserved for
    // paginated tabs.
    const liveRegion = screen
      .getByText(/results for "futon"\./i)
      .closest('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion!.textContent).not.toMatch(/Showing \d+–\d+ of/);
  });

  it("non-All view header surfaces 'Showing 1–12 of 41' for paginated tabs", async () => {
    // Active tab is products; total 41 across the match set.
    mockSearchProducts.mockResolvedValue(
      productResults(
        Array.from({ length: 12 }, (_, i) => ({
          _id: `p${i}`,
          slug: `p-${i}`,
          name: `Product ${i}`,
        })),
        41,
      ),
    );
    mockSearchPosts.mockResolvedValue(postResults([], 0));
    await renderSearch({ q: "futon", type: "products" });
    // Header includes "Showing 1–12 of 41 results for 'futon'."
    expect(screen.getByText(/Showing 1–12 of 41 results for "futon"\./)).toBeInTheDocument();
  });

  it("renders the prev/next pagination footer on non-All tabs when there is a next page", async () => {
    mockSearchProducts.mockResolvedValue(
      productResults(
        Array.from({ length: 12 }, (_, i) => ({
          _id: `p${i}`,
          slug: `p-${i}`,
          name: `Product ${i}`,
        })),
        41, // 41 total → page=1 has next
      ),
    );
    mockSearchPosts.mockResolvedValue(postResults([], 0));
    await renderSearch({ q: "futon", type: "products" });
    const pager = screen.getByRole("navigation", { name: /pagination/i });
    expect(pager).toBeInTheDocument();
    // "Next →" link present, "Previous" disabled (page 1).
    expect(within(pager).getByRole("link", { name: /next/i })).toBeInTheDocument();
    expect(within(pager).queryByRole("link", { name: /previous/i })).toBeNull();
  });

  it("hides the pagination footer on the All tab (All shows capped sample, not paginated)", async () => {
    mockSearchProducts.mockResolvedValue(
      productResults(
        Array.from({ length: 12 }, (_, i) => ({
          _id: `p${i}`,
          slug: `p-${i}`,
          name: `Product ${i}`,
        })),
        41,
      ),
    );
    mockSearchPosts.mockResolvedValue(postResults([], 0));
    await renderSearch({ q: "futon", type: "all" });
    expect(screen.queryByRole("navigation", { name: /pagination/i })).toBeNull();
  });

  it("page=2 forwards correctly to the libs and renders the second page header", async () => {
    mockSearchProducts.mockResolvedValue(
      productResults(
        Array.from({ length: 12 }, (_, i) => ({
          _id: `p${i + 12}`,
          slug: `p-${i + 12}`,
          name: `Product ${i + 12}`,
        })),
        41,
      ),
    );
    mockSearchPosts.mockResolvedValue(postResults([], 0));
    await renderSearch({ q: "futon", type: "products", page: "2" });
    // Header reflects page 2.
    expect(screen.getByText(/Showing 13–24 of 41/)).toBeInTheDocument();
    // Lib called with page=2.
    expect(mockSearchProducts).toHaveBeenCalledWith("futon", { page: 2, pageSize: 12 });
  });

  it("over-pagination (page=999) on products tab shows NoResultsForType (Try All link)", async () => {
    mockSearchProducts.mockResolvedValue(productResults([], 41));
    mockSearchPosts.mockResolvedValue(postResults([], 0));
    await renderSearch({ q: "futon", type: "products", page: "999" });
    // No products region (empty page).
    expect(
      screen.queryByRole("region", { name: /products/i }),
    ).not.toBeInTheDocument();
    // Try All recovery link.
    expect(screen.getByRole("link", { name: /try all/i })).toBeInTheDocument();
  });

  it("invalid page=abc defaults to page 1", async () => {
    mockSearchProducts.mockResolvedValue(
      productResults([{ _id: "p1", slug: "p1", name: "P1" }], 12),
    );
    mockSearchPosts.mockResolvedValue(postResults([], 0));
    await renderSearch({ q: "futon", type: "products", page: "abc" });
    expect(mockSearchProducts).toHaveBeenCalledWith("futon", { page: 1, pageSize: 12 });
  });
});
