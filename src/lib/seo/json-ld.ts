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

export type ProductReviewInput = {
  author: string;
  rating: number;
  title: string;
  body: string;
  date: string;
};

export type ProductAggregateRatingInput = {
  ratingValue: number;
  reviewCount: number;
};

export type ProductSchemaInput = {
  name: string;
  description: string;
  imageUrl: string | undefined;
  priceUSD: number;
  inStock: boolean;
  canonicalUrl: string;
  aggregateRating?: ProductAggregateRatingInput;
  reviews?: ReadonlyArray<ProductReviewInput>;
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

type AggregateRating = {
  "@type": "AggregateRating";
  ratingValue: string;
  reviewCount: number;
  bestRating: "5";
  worstRating: "1";
};

type ReviewNode = {
  "@type": "Review";
  author: { "@type": "Person"; name: string };
  reviewRating: {
    "@type": "Rating";
    ratingValue: string;
    bestRating: "5";
    worstRating: "1";
  };
  name: string;
  reviewBody: string;
  datePublished: string;
};

export type ProductSchema = {
  "@context": "https://schema.org";
  "@type": "Product";
  name: string;
  description: string;
  image?: string;
  url: string;
  offers: Offer;
  aggregateRating?: AggregateRating;
  review?: ReadonlyArray<ReviewNode>;
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
  // Only emit aggregateRating when honest stats exist; cf-xe54 removed the
  // hash-fabricated fallback so callers must pass real data or omit.
  if (input.aggregateRating && input.aggregateRating.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.aggregateRating.ratingValue.toFixed(1),
      reviewCount: input.aggregateRating.reviewCount,
      bestRating: "5",
      worstRating: "1",
    };
  }
  if (input.reviews && input.reviews.length > 0) {
    schema.review = input.reviews.map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating.toFixed(1),
        bestRating: "5",
        worstRating: "1",
      },
      name: r.title,
      reviewBody: r.body,
      datePublished: r.date,
    }));
  }
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

// cf-3qt.4.1: FAQPage schema for /faq. Mirrors the structure documented
// at https://schema.org/FAQPage so the rich-result eligibility checker
// in Search Console accepts it. Each Question must have a single
// acceptedAnswer Answer; pages with more than one answer per question
// are not eligible per Google's docs.
export type FaqPageEntry = { question: string; answer: string };

export type FaqPageSchema = {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: ReadonlyArray<{
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }>;
};

export function buildFaqPageSchema(
  entries: ReadonlyArray<FaqPageEntry>,
): FaqPageSchema {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((e) => ({
      "@type": "Question",
      name: e.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: e.answer,
      },
    })),
  };
}
