// schema.org JSON-LD builders. Consumed by the root layout (Organization),
// PDP (Product + BreadcrumbList), and PLP (BreadcrumbList). Kept as pure
// functions that return plain objects — rendering is the component's job
// so the same builders can be unit-tested without a DOM and reused in
// future surfaces (e.g. blog ArticleSchema) without refactor.

import { BUSINESS, SOCIALS } from "@/lib/business/contact-info";

const DEFAULT_SITE_URL = "https://carolinafutons.com";

export function resolveSiteUrl(envValue: string | undefined | null): string {
  if (!envValue) return DEFAULT_SITE_URL;
  return envValue.replace(/\/+$/, "");
}

type PostalAddress = {
  "@type": "PostalAddress";
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
};

export type OrganizationSchema = {
  "@context": "https://schema.org";
  "@type": "Organization";
  name: string;
  url: string;
  logo: string;
  foundingDate: string;
  telephone: string;
  email: string;
  address: PostalAddress;
  sameAs: ReadonlyArray<string>;
};

export function buildOrganizationSchema(siteUrl: string): OrganizationSchema {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BUSINESS.name,
    url: siteUrl,
    logo: `${siteUrl}/brand/cf-logo-square.png`,
    foundingDate: String(BUSINESS.foundedYear),
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.street,
      addressLocality: BUSINESS.city,
      addressRegion: BUSINESS.state,
      postalCode: BUSINESS.zip,
      addressCountry: "US",
    },
    sameAs: SOCIALS.map((s) => s.href),
  };
}

export type ProductSchemaInput = {
  name: string;
  description: string;
  imageUrl: string | undefined;
  priceUSD: number;
  inStock: boolean;
  canonicalUrl: string;
};

type Offer = {
  "@type": "Offer";
  price: string;
  priceCurrency: "USD";
  availability:
    | "https://schema.org/InStock"
    | "https://schema.org/OutOfStock";
  url: string;
};

export type ProductSchema = {
  "@context": "https://schema.org";
  "@type": "Product";
  name: string;
  description: string;
  image?: string;
  url: string;
  offers: Offer;
};

export function buildProductSchema(input: ProductSchemaInput): ProductSchema {
  const schema: ProductSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    url: input.canonicalUrl,
    offers: {
      "@type": "Offer",
      price: input.priceUSD.toFixed(2),
      priceCurrency: "USD",
      availability: input.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: input.canonicalUrl,
    },
  };
  if (input.imageUrl) schema.image = input.imageUrl;
  return schema;
}

export type BreadcrumbItem = { name: string; url: string };

export type BreadcrumbSchema = {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: ReadonlyArray<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }>;
};

export function buildBreadcrumbSchema(
  crumbs: ReadonlyArray<BreadcrumbItem>,
): BreadcrumbSchema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}
