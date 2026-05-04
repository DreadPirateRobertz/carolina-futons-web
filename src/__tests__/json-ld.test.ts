import { describe, expect, it } from "vitest";

import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildOrganizationSchema,
  buildProductSchema,
  resolveSiteUrl,
} from "@/lib/seo/json-ld";
import { BUSINESS, SOCIALS } from "@/lib/business/contact-info";

// schema.org JSON-LD shape tests. No DOM rendering — these assert the
// exact property keys and values so a silent regression (e.g. dropping
// `offers` or renaming `address`) fails fast in CI. Consumers (layout,
// PDP, PLP) then render whatever the builders produce.

describe("resolveSiteUrl", () => {
  it("falls back to carolinafutons.com when env is unset", () => {
    expect(resolveSiteUrl(undefined)).toBe("https://carolinafutons.com");
    expect(resolveSiteUrl("")).toBe("https://carolinafutons.com");
  });

  it("strips a trailing slash from the env override", () => {
    expect(resolveSiteUrl("https://preview.carolinafutons.com/")).toBe(
      "https://preview.carolinafutons.com",
    );
  });

  it("returns the env override as-is when no trailing slash", () => {
    expect(resolveSiteUrl("https://staging.example.com")).toBe(
      "https://staging.example.com",
    );
  });
});

describe("buildOrganizationSchema", () => {
  it("emits a schema.org Organization with CF data sourced from BUSINESS", () => {
    const schema = buildOrganizationSchema("https://carolinafutons.com");
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("Organization");
    expect(schema.name).toBe(BUSINESS.name);
    expect(schema.url).toBe("https://carolinafutons.com");
    expect(schema.logo).toBe(
      "https://carolinafutons.com/brand/cf-logo-square.png",
    );
    expect(schema.foundingDate).toBe(String(BUSINESS.foundedYear));
    expect(schema.telephone).toBe(BUSINESS.phone);
    expect(schema.email).toBe(BUSINESS.email);
  });

  it("embeds a PostalAddress with the BUSINESS street/city/state/zip", () => {
    const { address } = buildOrganizationSchema("https://carolinafutons.com");
    expect(address["@type"]).toBe("PostalAddress");
    expect(address.streetAddress).toBe(BUSINESS.street);
    expect(address.addressLocality).toBe(BUSINESS.city);
    expect(address.addressRegion).toBe(BUSINESS.state);
    expect(address.postalCode).toBe(BUSINESS.zip);
    expect(address.addressCountry).toBe("US");
  });

  it("exposes the four social URLs under sameAs in SOCIALS order", () => {
    const schema = buildOrganizationSchema("https://carolinafutons.com");
    expect(schema.sameAs).toEqual(SOCIALS.map((s) => s.href));
    expect(schema.sameAs).toHaveLength(4);
  });
});

describe("buildProductSchema", () => {
  const baseInput = {
    name: "Kingston Futon Frame",
    description: "Solid oak futon frame, handcrafted in North Carolina.",
    imageUrl: "https://static.wixstatic.com/media/example.jpg",
    priceUSD: 899,
    inStock: true,
    canonicalUrl: "https://carolinafutons.com/products/kingston-futon-frame",
  };

  it("emits a schema.org Product with canonical fields populated", () => {
    const schema = buildProductSchema(baseInput);
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("Product");
    expect(schema.name).toBe(baseInput.name);
    expect(schema.description).toBe(baseInput.description);
    expect(schema.image).toBe(baseInput.imageUrl);
    expect(schema.url).toBe(baseInput.canonicalUrl);
  });

  it("emits an Offer with price, priceCurrency, availability, and url", () => {
    const { offers } = buildProductSchema(baseInput);
    expect(offers["@type"]).toBe("Offer");
    expect(offers.price).toBe("899.00");
    expect(offers.priceCurrency).toBe("USD");
    expect(offers.availability).toBe("https://schema.org/InStock");
    expect(offers.url).toBe(baseInput.canonicalUrl);
  });

  it("maps out-of-stock to schema.org/OutOfStock", () => {
    const { offers } = buildProductSchema({ ...baseInput, inStock: false });
    expect(offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("omits image from the schema when imageUrl is absent", () => {
    const schema = buildProductSchema({ ...baseInput, imageUrl: undefined });
    expect(schema.image).toBeUndefined();
  });

  it("formats priceless products with a 0.00 price (schema still valid)", () => {
    const schema = buildProductSchema({ ...baseInput, priceUSD: 0 });
    expect(schema.offers.price).toBe("0.00");
  });

  it("omits aggregateRating and review when callers do not pass them", () => {
    const schema = buildProductSchema(baseInput);
    expect(schema.aggregateRating).toBeUndefined();
    expect(schema.review).toBeUndefined();
  });

  it("emits aggregateRating with bestRating/worstRating when stats are honest", () => {
    const schema = buildProductSchema({
      ...baseInput,
      aggregateRating: { ratingValue: 4.9, reviewCount: 42 },
    });
    expect(schema.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: 42,
      bestRating: "5",
      worstRating: "1",
    });
  });

  it("omits aggregateRating when reviewCount is 0 — never advertise zero-count averages", () => {
    const schema = buildProductSchema({
      ...baseInput,
      aggregateRating: { ratingValue: 0, reviewCount: 0 },
    });
    expect(schema.aggregateRating).toBeUndefined();
  });

  it("emits Review nodes with Person author, Rating, datePublished, name, body", () => {
    const schema = buildProductSchema({
      ...baseInput,
      reviews: [
        {
          author: "Marcia R.",
          rating: 5,
          title: "Solid hardwood",
          body: "Six years, still rock solid.",
          date: "2026-02-14",
        },
      ],
    });
    expect(schema.review).toHaveLength(1);
    const r = schema.review![0]!;
    expect(r["@type"]).toBe("Review");
    expect(r.author).toEqual({ "@type": "Person", name: "Marcia R." });
    expect(r.reviewRating).toEqual({
      "@type": "Rating",
      ratingValue: "5.0",
      bestRating: "5",
      worstRating: "1",
    });
    expect(r.name).toBe("Solid hardwood");
    expect(r.reviewBody).toBe("Six years, still rock solid.");
    expect(r.datePublished).toBe("2026-02-14");
  });

  it("omits the review array entirely when callers pass an empty list", () => {
    const schema = buildProductSchema({ ...baseInput, reviews: [] });
    expect(schema.review).toBeUndefined();
  });
});

describe("buildBreadcrumbSchema", () => {
  it("emits a BreadcrumbList with 1-based positions matching item order", () => {
    const schema = buildBreadcrumbSchema([
      { name: "Home", url: "https://carolinafutons.com/" },
      { name: "Shop", url: "https://carolinafutons.com/shop" },
      {
        name: "Futon Frames",
        url: "https://carolinafutons.com/shop/futon-frames",
      },
    ]);
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("BreadcrumbList");
    expect(schema.itemListElement).toHaveLength(3);
    schema.itemListElement.forEach((item, i) => {
      expect(item["@type"]).toBe("ListItem");
      expect(item.position).toBe(i + 1);
    });
    expect(schema.itemListElement[0]!.name).toBe("Home");
    expect(schema.itemListElement[0]!.item).toBe(
      "https://carolinafutons.com/",
    );
    expect(schema.itemListElement[2]!.name).toBe("Futon Frames");
  });

  it("returns an empty itemListElement for an empty crumb trail", () => {
    const schema = buildBreadcrumbSchema([]);
    expect(schema.itemListElement).toEqual([]);
  });
});

describe("buildArticleSchema", () => {
  const base = {
    title: "Choosing the Right Futon Frame",
    description: "A guide to picking the perfect futon for your home.",
    canonicalUrl:
      "https://carolinafutons.com/blog/choosing-the-right-futon-frame",
    siteUrl: "https://carolinafutons.com",
    publishedDate: new Date("2026-02-01T12:00:00Z"),
  };

  it("emits @context schema.org and @type BlogPosting", () => {
    const schema = buildArticleSchema(base);
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("BlogPosting");
  });

  it("sets headline from title", () => {
    expect(buildArticleSchema(base).headline).toBe(base.title);
  });

  it("sets description", () => {
    expect(buildArticleSchema(base).description).toBe(base.description);
  });

  it("sets url to canonicalUrl", () => {
    expect(buildArticleSchema(base).url).toBe(base.canonicalUrl);
  });

  it("formats datePublished as ISO 8601", () => {
    expect(buildArticleSchema(base).datePublished).toBe(
      "2026-02-01T12:00:00.000Z",
    );
  });

  it("sets author and publisher to BUSINESS.name Organization (not hardcoded string)", () => {
    const schema = buildArticleSchema(base);
    const expected = {
      "@type": "Organization",
      name: BUSINESS.name,
      url: base.siteUrl,
    };
    expect(schema.author).toEqual(expected);
    expect(schema.publisher).toEqual(expected);
  });

  it("author and publisher are separate objects — mutation of one does not affect the other", () => {
    const schema = buildArticleSchema(base);
    expect(schema.author).not.toBe(schema.publisher);
  });

  it("truncates headline to 110 chars — Google BlogPosting requirement", () => {
    const longTitle = "A".repeat(120);
    expect(buildArticleSchema({ ...base, title: longTitle }).headline).toBe(
      "A".repeat(110),
    );
  });

  it("preserves headline as-is when 110 chars or fewer", () => {
    expect(buildArticleSchema(base).headline).toBe(base.title);
  });

  it("includes image when heroImageUrl is provided", () => {
    const schema = buildArticleSchema({
      ...base,
      heroImageUrl: "https://static.wixstatic.com/media/hero.jpg",
    });
    expect(schema.image).toBe("https://static.wixstatic.com/media/hero.jpg");
  });

  it("omits image when heroImageUrl is null", () => {
    expect(
      buildArticleSchema({ ...base, heroImageUrl: null }).image,
    ).toBeUndefined();
  });

  it("omits image entirely when heroImageUrl is not passed", () => {
    expect(buildArticleSchema(base).image).toBeUndefined();
  });

  it("omits datePublished when publishedDate is null", () => {
    expect(
      buildArticleSchema({ ...base, publishedDate: null }).datePublished,
    ).toBeUndefined();
  });
});
