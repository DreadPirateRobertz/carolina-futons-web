import { describe, it, expect } from "vitest";

import {
  buildCompareRows,
  buildCompareTitle,
  buildRemoveSlugUrl,
  COMPARE_ATTRIBUTES,
  COMPARE_MAX,
  COMPARE_MIN,
  getCompareAttribute,
  isDiff,
  parseCompareSlugs,
  shouldShowEmpty,
  type CompareProduct,
} from "@/lib/product/compare";

describe("parseCompareSlugs", () => {
  it("returns [] for missing input", () => {
    expect(parseCompareSlugs(undefined)).toEqual([]);
  });

  it("splits a comma-list and trims whitespace", () => {
    expect(parseCompareSlugs(" a , b ,c ")).toEqual(["a", "b", "c"]);
  });

  it("drops empty entries", () => {
    expect(parseCompareSlugs("a,,b,")).toEqual(["a", "b"]);
  });

  it(`caps at COMPARE_MAX (${COMPARE_MAX})`, () => {
    expect(parseCompareSlugs("a,b,c,d,e,f")).toEqual(["a", "b", "c", "d"]);
  });

  it("flattens an array search-param value", () => {
    expect(parseCompareSlugs(["a", "b,c"])).toEqual(["a", "b", "c"]);
  });
});

describe("shouldShowEmpty", () => {
  it("is true for fewer than COMPARE_MIN entries", () => {
    expect(shouldShowEmpty([])).toBe(true);
    expect(shouldShowEmpty(["one"])).toBe(true);
  });

  it("is false at COMPARE_MIN or more", () => {
    expect(shouldShowEmpty(new Array(COMPARE_MIN).fill("x"))).toBe(false);
  });
});

describe("getCompareAttribute", () => {
  const monterey: CompareProduct = {
    name: "Monterey",
    inStock: true,
    numericRating: 4.5,
    priceData: { formatted: { price: "$899.00" }, price: 899 },
    additionalInfoSections: [
      { title: "Frame Material", description: "Solid hardwood" },
      { title: "Weight Capacity", description: "<p>500 lbs</p>" },
    ],
  };

  it("returns the formatted price when available", () => {
    expect(getCompareAttribute(monterey, "Price")).toBe("$899.00");
  });

  it("falls back to numeric price when formatted is absent", () => {
    expect(
      getCompareAttribute(
        { priceData: { price: 100 } } as CompareProduct,
        "Price",
      ),
    ).toBe("$100.00");
  });

  it("renders the rating as 'N / 5'", () => {
    expect(getCompareAttribute(monterey, "Rating")).toBe("4.5 / 5");
  });

  it("renders '—' when the rating is missing", () => {
    expect(getCompareAttribute({} as CompareProduct, "Rating")).toBe("—");
  });

  it("renders 'In Stock' / 'Out of Stock' from the boolean", () => {
    expect(getCompareAttribute(monterey, "In Stock")).toBe("In Stock");
    expect(
      getCompareAttribute(
        { inStock: false } as CompareProduct,
        "In Stock",
      ),
    ).toBe("Out of Stock");
  });

  it("looks up additionalInfoSections case-insensitively", () => {
    expect(getCompareAttribute(monterey, "Frame Material")).toBe(
      "Solid hardwood",
    );
    expect(getCompareAttribute(monterey, "frame material")).toBe(
      "Solid hardwood",
    );
  });

  it("strips simple HTML from CMS-authored sections", () => {
    expect(getCompareAttribute(monterey, "Weight Capacity")).toBe("500 lbs");
  });

  it("returns '—' when the requested attribute isn't on the product", () => {
    expect(getCompareAttribute(monterey, "Mattress Size")).toBe("—");
  });
});

describe("isDiff", () => {
  it.each([
    [[], false],
    [["a"], false],
    [["a", "a"], false],
    [["a", "b"], true],
    [["a", "a", "b"], true],
  ])("isDiff(%j) === %s", (values, expected) => {
    expect(isDiff(values as string[])).toBe(expected);
  });
});

describe("buildCompareRows", () => {
  it("returns one row per COMPARE_ATTRIBUTES entry", () => {
    const rows = buildCompareRows([{}, {}] as CompareProduct[]);
    expect(rows).toHaveLength(COMPARE_ATTRIBUTES.length);
    expect(rows.map((r) => r.label)).toEqual(
      COMPARE_ATTRIBUTES.map((a) => a.label),
    );
  });

  it("flags hasDiff when product values diverge for an attribute", () => {
    const rows = buildCompareRows([
      { inStock: true } as CompareProduct,
      { inStock: false } as CompareProduct,
    ]);
    const stockRow = rows.find((r) => r.key === "inStock");
    expect(stockRow?.values).toEqual(["In Stock", "Out of Stock"]);
    expect(stockRow?.hasDiff).toBe(true);
  });

  it("does not flag hasDiff when all values match", () => {
    const rows = buildCompareRows([
      { inStock: true } as CompareProduct,
      { inStock: true } as CompareProduct,
    ]);
    const stockRow = rows.find((r) => r.key === "inStock");
    expect(stockRow?.hasDiff).toBe(false);
  });
});

describe("buildCompareTitle", () => {
  it("returns the bare title for an empty product list", () => {
    expect(buildCompareTitle([])).toBe("Compare — Carolina Futons");
  });

  it("joins product names with 'vs'", () => {
    expect(
      buildCompareTitle([
        { name: "Monterey" } as CompareProduct,
        { name: "Asheville" } as CompareProduct,
      ]),
    ).toBe("Compare Monterey vs Asheville — Carolina Futons");
  });
});

describe("buildRemoveSlugUrl", () => {
  it("drops the slug and returns a /compare?slugs= URL with the rest", () => {
    expect(buildRemoveSlugUrl(["a", "b", "c"], "b")).toBe(
      "/compare?slugs=a,c",
    );
  });

  it("returns /compare alone when removing would drop below COMPARE_MIN", () => {
    expect(buildRemoveSlugUrl(["a", "b"], "a")).toBe("/compare");
  });

  it("is a no-op for a slug not in the list", () => {
    expect(buildRemoveSlugUrl(["a", "b"], "z")).toBe("/compare?slugs=a,b");
  });
});
