// cf-0t9 (cf-ruhm.7): page-level tests for the curated /compare/popular-futons
// SEO landing. Mocks getProductBySlug for the 3 hard-coded slugs and asserts:
//   - Renders the H1 + intro copy
//   - Renders CompareTable when products resolve
//   - Falls back to the "unavailable" pane when <COMPARE_MIN products resolve
//   - Metadata exports canonical URL (page is indexable, not noindex)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("@/lib/wix/products", () => ({
  getProductBySlug: vi.fn(),
}));

import { getProductBySlug } from "@/lib/wix/products";
import ComparePopularFutonsPage, {
  metadata as comparePopularMetadata,
} from "@/app/compare/popular-futons/page";

const mockGet = vi.mocked(getProductBySlug);

function mkProduct(slug: string, name: string) {
  return {
    _id: `id-${slug}`,
    slug,
    name,
    inStock: true,
    numericRating: 4.5,
    priceData: { formatted: { price: "$899.00" }, price: 899 },
    media: { mainMedia: { image: { url: `https://cdn/${slug}.jpg` } } },
    additionalInfoSections: [
      { title: "Frame Material", description: "Solid hardwood" },
    ],
  };
}

beforeEach(() => {
  mockGet.mockReset();
});

describe("/compare/popular-futons — happy path", () => {
  it("renders the H1 + buying-guide intro", async () => {
    mockGet.mockImplementation((slug: string) =>
      Promise.resolve(mkProduct(slug, slug) as never),
    );
    const ui = await ComparePopularFutonsPage();
    render(ui);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /compare popular futon frames/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/buying guide/i)).toBeInTheDocument();
  });

  it("renders the CompareTable with the 3 popular slugs", async () => {
    mockGet.mockImplementation((slug: string) =>
      Promise.resolve(mkProduct(slug, slug) as never),
    );
    const ui = await ComparePopularFutonsPage();
    render(ui);
    const table = screen.getByRole("table", { name: /product comparison/i });
    expect(table).toBeInTheDocument();
    // Each curated slug appears as a column-head link.
    expect(within(table).getByText("kingston-futon-frame")).toBeInTheDocument();
    expect(within(table).getByText("sedona-futon-frame")).toBeInTheDocument();
    expect(within(table).getByText("alpine-futon-frame")).toBeInTheDocument();
  });

  it("requested the 3 popular slugs from the catalog reader", async () => {
    mockGet.mockImplementation((slug: string) =>
      Promise.resolve(mkProduct(slug, slug) as never),
    );
    const ui = await ComparePopularFutonsPage();
    render(ui);
    expect(mockGet).toHaveBeenCalledWith("kingston-futon-frame");
    expect(mockGet).toHaveBeenCalledWith("sedona-futon-frame");
    expect(mockGet).toHaveBeenCalledWith("alpine-futon-frame");
  });
});

describe("/compare/popular-futons — graceful degradation", () => {
  it("renders the unavailable pane when ALL slugs 404", async () => {
    mockGet.mockResolvedValue(null);
    const ui = await ComparePopularFutonsPage();
    render(ui);
    expect(
      screen.getByText(/couldn.t load the comparison just now/i),
    ).toBeInTheDocument();
    // No CompareTable in this state.
    expect(
      screen.queryByRole("table", { name: /product comparison/i }),
    ).toBeNull();
  });

  it("renders the unavailable pane when only 1 slug resolves (< COMPARE_MIN)", async () => {
    mockGet.mockImplementation((slug: string) =>
      Promise.resolve(
        slug === "kingston-futon-frame" ? (mkProduct(slug, slug) as never) : null,
      ),
    );
    const ui = await ComparePopularFutonsPage();
    render(ui);
    expect(
      screen.getByText(/couldn.t load the comparison just now/i),
    ).toBeInTheDocument();
  });

  it("survives a thrown error in one slug fetch (other slugs still render)", async () => {
    mockGet.mockImplementation((slug: string) => {
      if (slug === "sedona-futon-frame") {
        return Promise.reject(new Error("Wix outage"));
      }
      return Promise.resolve(mkProduct(slug, slug) as never);
    });
    const ui = await ComparePopularFutonsPage();
    render(ui);
    // 2 of 3 resolved — still >= COMPARE_MIN, so the table renders.
    const table = screen.getByRole("table", { name: /product comparison/i });
    expect(table).toBeInTheDocument();
    expect(within(table).getByText("kingston-futon-frame")).toBeInTheDocument();
    expect(within(table).getByText("alpine-futon-frame")).toBeInTheDocument();
    expect(within(table).queryByText("sedona-futon-frame")).toBeNull();
  });
});

describe("/compare/popular-futons — metadata", () => {
  it("exports a canonical URL pointing at /compare/popular-futons", () => {
    const canonical = comparePopularMetadata.alternates?.canonical;
    expect(typeof canonical).toBe("string");
    expect(canonical).toMatch(/\/compare\/popular-futons$/);
  });

  it("is indexable (robots is NOT set to noindex)", () => {
    // Either undefined (defaults to indexable) or an explicit index: true.
    const robots = comparePopularMetadata.robots;
    if (typeof robots === "object" && robots !== null && "index" in robots) {
      expect(robots.index).not.toBe(false);
    }
    // No explicit robots field also means indexable by default — that's fine.
  });

  it("openGraph block mirrors title + description for crawlers", () => {
    const og = comparePopularMetadata.openGraph;
    expect(og).toBeDefined();
    expect((og as { title?: string }).title).toMatch(/Compare Popular Futon Frames/);
  });

  it("twitter block mirrors openGraph (via twitterFromOpenGraph helper)", () => {
    const tw = comparePopularMetadata.twitter;
    expect(tw).toBeDefined();
    // card defaults to summary_large_image when there's an image.
    expect((tw as { card?: string }).card).toBe("summary_large_image");
  });
});
