import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const productMocks = vi.hoisted(() => ({
  getProductBySlug: vi.fn(),
}));

vi.mock("@/lib/wix/products", () => ({
  getProductBySlug: productMocks.getProductBySlug,
}));

const monterey = {
  _id: "P-1",
  slug: "monterey-futon",
  name: "Monterey Futon",
  inStock: true,
  numericRating: 4.5,
  priceData: { formatted: { price: "$899.00" }, price: 899 },
  media: { mainMedia: { image: { url: "https://cdn/x.jpg" } } },
  additionalInfoSections: [
    { title: "Frame Material", description: "Solid hardwood" },
  ],
};

const asheville = {
  _id: "P-2",
  slug: "asheville-daybed",
  name: "Asheville Daybed",
  inStock: false,
  numericRating: 4,
  priceData: { formatted: { price: "$1,299.00" }, price: 1299 },
  media: { mainMedia: { image: { url: "https://cdn/y.jpg" } } },
  additionalInfoSections: [
    { title: "Frame Material", description: "Powder-coated steel" },
  ],
};

beforeEach(() => {
  productMocks.getProductBySlug.mockReset();
});

async function renderPage(
  searchParams: Record<string, string | string[] | undefined> = {},
) {
  const { default: ComparePage } = await import("@/app/compare/page");
  const ui = await ComparePage({
    searchParams: Promise.resolve(searchParams),
  });
  return render(ui);
}

describe("ComparePage — empty states", () => {
  it("renders the too-few-slugs empty state when no slugs are passed", async () => {
    await renderPage();
    const main = screen.getByRole("main");
    expect(main.getAttribute("data-reason")).toBe("too-few-slugs");
    expect(productMocks.getProductBySlug).not.toHaveBeenCalled();
  });

  it("renders the too-few-slugs empty state when only one slug is passed", async () => {
    await renderPage({ slugs: "monterey-futon" });
    const main = screen.getByRole("main");
    expect(main.getAttribute("data-reason")).toBe("too-few-slugs");
  });

  it("renders the products-not-found state when slugs resolve to nothing", async () => {
    productMocks.getProductBySlug.mockResolvedValue(null);
    await renderPage({ slugs: "x,y" });
    const main = screen.getByRole("main");
    expect(main.getAttribute("data-reason")).toBe("products-not-found");
  });

  it("renders the products-not-found state when only one slug resolves (drops below MIN)", async () => {
    productMocks.getProductBySlug.mockResolvedValueOnce(monterey);
    productMocks.getProductBySlug.mockResolvedValueOnce(null);
    await renderPage({ slugs: "monterey-futon,nope" });
    const main = screen.getByRole("main");
    expect(main.getAttribute("data-reason")).toBe("products-not-found");
  });

  it("recovers when getProductBySlug throws on one slug — keeps the others", async () => {
    productMocks.getProductBySlug.mockRejectedValueOnce(new Error("boom"));
    productMocks.getProductBySlug.mockResolvedValueOnce(monterey);
    productMocks.getProductBySlug.mockResolvedValueOnce(asheville);
    await renderPage({ slugs: "broken,monterey-futon,asheville-daybed" });
    expect(
      screen.getByRole("table", { name: /product comparison/i }),
    ).toBeInTheDocument();
  });
});

describe("ComparePage — table render", () => {
  it("renders one column per resolved product with name + image + remove link", async () => {
    productMocks.getProductBySlug.mockImplementation(async (slug: string) =>
      slug === "monterey-futon" ? monterey : asheville,
    );
    await renderPage({ slugs: "monterey-futon,asheville-daybed" });
    expect(
      screen.getByRole("link", { name: "Monterey Futon" }).getAttribute("href"),
    ).toBe("/products/monterey-futon");
    expect(
      screen.getByRole("link", { name: "Asheville Daybed" }).getAttribute("href"),
    ).toBe("/products/asheville-daybed");
    const removeLinks = screen
      .getAllByRole("link", { name: /^remove$/i })
      .map((l) => l.getAttribute("href"));
    // Removing either product from a 2-product compare drops below
    // COMPARE_MIN, so both remove links collapse to /compare.
    expect(removeLinks).toEqual(["/compare", "/compare"]);
  });

  it("preserves the remaining slugs in the remove link when there are 3+ products", async () => {
    productMocks.getProductBySlug.mockImplementation(async (slug: string) => {
      if (slug === "monterey-futon") return monterey;
      if (slug === "asheville-daybed") return asheville;
      return { ...monterey, _id: "P-3", slug, name: `Product ${slug}` };
    });
    await renderPage({ slugs: "monterey-futon,asheville-daybed,blue-ridge" });
    const removeLinks = screen
      .getAllByRole("link", { name: /^remove$/i })
      .map((l) => l.getAttribute("href"));
    expect(removeLinks).toEqual([
      "/compare?slugs=asheville-daybed,blue-ridge",
      "/compare?slugs=monterey-futon,blue-ridge",
      "/compare?slugs=monterey-futon,asheville-daybed",
    ]);
  });

  it("renders the In Stock row with diverging values + data-has-diff='true'", async () => {
    productMocks.getProductBySlug.mockImplementation(async (slug: string) =>
      slug === "monterey-futon" ? monterey : asheville,
    );
    await renderPage({ slugs: "monterey-futon,asheville-daybed" });
    const stockRow = document.querySelector(
      "[data-slot='compare-row'][data-attr='inStock']",
    ) as HTMLElement;
    expect(stockRow).not.toBeNull();
    expect(stockRow.getAttribute("data-has-diff")).toBe("true");
    const cellTexts = Array.from(stockRow.querySelectorAll("td")).map(
      (td) => td.textContent,
    );
    expect(cellTexts).toEqual(["In Stock", "Out of Stock"]);
  });

  it("renders the Frame Material row with values and same-vs-diff styling", async () => {
    productMocks.getProductBySlug.mockImplementation(async (slug: string) =>
      slug === "monterey-futon" ? monterey : asheville,
    );
    await renderPage({ slugs: "monterey-futon,asheville-daybed" });
    const frameRow = document.querySelector(
      "[data-slot='compare-row'][data-attr='frameMaterial']",
    ) as HTMLElement;
    expect(frameRow).not.toBeNull();
    expect(frameRow.getAttribute("data-has-diff")).toBe("true");
    const cellTexts = Array.from(frameRow.querySelectorAll("td")).map(
      (td) => td.textContent,
    );
    expect(cellTexts).toEqual(["Solid hardwood", "Powder-coated steel"]);
  });

  it("caps to 4 columns when more than 4 slugs are passed", async () => {
    productMocks.getProductBySlug.mockResolvedValue(monterey);
    await renderPage({ slugs: "a,b,c,d,e,f" });
    expect(productMocks.getProductBySlug).toHaveBeenCalledTimes(4);
  });
});
