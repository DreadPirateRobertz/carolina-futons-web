import { describe, expect, it } from "vitest";

import {
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
