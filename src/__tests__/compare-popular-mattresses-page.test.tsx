// cf-2m1 (cf-0t9.1): page-level tests for /compare/popular-mattresses,
// sibling to compare-popular-futons-page.test.tsx. Mocks getProductBySlug
// for the 3 Mesa mattress slugs and asserts the curated landing renders,
// degrades gracefully on partial outages, and emits indexable metadata.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("@/lib/wix/products", () => ({
  getProductBySlug: vi.fn(),
}));

import { getProductBySlug } from "@/lib/wix/products";
import ComparePopularMattressesPage, {
  metadata as compareMattressesMetadata,
} from "@/app/compare/popular-mattresses/page";

const mockGet = vi.mocked(getProductBySlug);

function mkProduct(slug: string, name: string) {
  return {
    _id: `id-${slug}`,
    slug,
    name,
    inStock: true,
    numericRating: 4.5,
    priceData: { formatted: { price: "$549.00" }, price: 549 },
    media: { mainMedia: { image: { url: `https://cdn/${slug}.jpg` } } },
    additionalInfoSections: [
      { title: "Frame Material", description: "Cotton + wool batting" },
    ],
  };
}

beforeEach(() => {
  mockGet.mockReset();
});

describe("/compare/popular-mattresses — happy path", () => {
  it("renders the H1 + buying-guide intro", async () => {
    mockGet.mockImplementation((slug: string) =>
      Promise.resolve(mkProduct(slug, slug) as never),
    );
    const ui = await ComparePopularMattressesPage();
    render(ui);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /compare mesa futon mattresses/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/buying guide/i)).toBeInTheDocument();
  });

  it("renders the CompareTable with the 3 Mesa slugs", async () => {
    mockGet.mockImplementation((slug: string) =>
      Promise.resolve(mkProduct(slug, slug) as never),
    );
    const ui = await ComparePopularMattressesPage();
    render(ui);
    const table = screen.getByRole("table", { name: /product comparison/i });
    expect(table).toBeInTheDocument();
    expect(within(table).getByText("mesa-1000-mattress")).toBeInTheDocument();
    expect(within(table).getByText("mesa-3000-mattress")).toBeInTheDocument();
    expect(within(table).getByText("mesa-5000-mattress")).toBeInTheDocument();
  });

  it("requested the 3 Mesa slugs from the catalog reader", async () => {
    mockGet.mockImplementation((slug: string) =>
      Promise.resolve(mkProduct(slug, slug) as never),
    );
    const ui = await ComparePopularMattressesPage();
    render(ui);
    expect(mockGet).toHaveBeenCalledWith("mesa-1000-mattress");
    expect(mockGet).toHaveBeenCalledWith("mesa-3000-mattress");
    expect(mockGet).toHaveBeenCalledWith("mesa-5000-mattress");
  });

  it("links to /shop/mattresses (not /shop/futon-frames) for the fallback browse CTA", async () => {
    mockGet.mockImplementation((slug: string) =>
      Promise.resolve(mkProduct(slug, slug) as never),
    );
    const ui = await ComparePopularMattressesPage();
    render(ui);
    const browse = screen.getByRole("link", { name: /browse all mattresses/i });
    expect(browse.getAttribute("href")).toBe("/shop/mattresses");
  });
});

describe("/compare/popular-mattresses — graceful degradation", () => {
  it("renders the unavailable pane when ALL slugs 404", async () => {
    mockGet.mockResolvedValue(null);
    const ui = await ComparePopularMattressesPage();
    render(ui);
    expect(
      screen.getByText(/couldn.t load the comparison just now/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("table", { name: /product comparison/i }),
    ).toBeNull();
  });

  it("renders the unavailable pane when only 1 slug resolves (< COMPARE_MIN)", async () => {
    mockGet.mockImplementation((slug: string) =>
      Promise.resolve(
        slug === "mesa-3000-mattress" ? (mkProduct(slug, slug) as never) : null,
      ),
    );
    const ui = await ComparePopularMattressesPage();
    render(ui);
    expect(
      screen.getByText(/couldn.t load the comparison just now/i),
    ).toBeInTheDocument();
  });

  it("survives a thrown error in one slug fetch (other slugs still render)", async () => {
    mockGet.mockImplementation((slug: string) => {
      if (slug === "mesa-3000-mattress") {
        return Promise.reject(new Error("Wix outage"));
      }
      return Promise.resolve(mkProduct(slug, slug) as never);
    });
    const ui = await ComparePopularMattressesPage();
    render(ui);
    const table = screen.getByRole("table", { name: /product comparison/i });
    expect(table).toBeInTheDocument();
    expect(within(table).getByText("mesa-1000-mattress")).toBeInTheDocument();
    expect(within(table).getByText("mesa-5000-mattress")).toBeInTheDocument();
    expect(within(table).queryByText("mesa-3000-mattress")).toBeNull();
  });
});

describe("/compare/popular-mattresses — metadata", () => {
  it("exports a canonical URL pointing at /compare/popular-mattresses", () => {
    const canonical = compareMattressesMetadata.alternates?.canonical;
    expect(typeof canonical).toBe("string");
    expect(canonical).toMatch(/\/compare\/popular-mattresses$/);
  });

  it("is indexable (robots is NOT set to noindex)", () => {
    const robots = compareMattressesMetadata.robots;
    if (typeof robots === "object" && robots !== null && "index" in robots) {
      expect(robots.index).not.toBe(false);
    }
  });

  it("openGraph mirrors title + description for crawlers", () => {
    const og = compareMattressesMetadata.openGraph;
    expect(og).toBeDefined();
    expect((og as { title?: string }).title).toMatch(/Mesa Futon Mattresses/);
  });

  it("twitter mirrors openGraph via the helper", () => {
    const tw = compareMattressesMetadata.twitter;
    expect(tw).toBeDefined();
    expect((tw as { card?: string }).card).toBe("summary_large_image");
  });
});
