// cf-89fb: regression coverage for the canonical-URL contract on the 8
// static-metadata routes. cf-bbo8 wired canonicals for the dynamic PDP +
// PLP routes (via generateMetadata); cf-89fb extended the same shape to
// the static metadata exports. Without this test, a future refactor that
// drops `alternates.canonical` from any of these pages would land without
// signal — and the cf-oj8u meta-tag smoke would have to catch it post-
// deploy instead of pre-merge.
//
// Pattern mirrors src/__tests__/city-page.test.tsx (the canonical-on-
// /near/[city-slug] check) — assert against the string-coerced canonical
// because Next types it as `string | URL`.

import type { Metadata } from "next";
import { describe, it, expect } from "vitest";

import { metadata as homeMetadata } from "@/app/page";
import { metadata as aboutMetadata } from "@/app/about/page";
import { metadata as visitMetadata } from "@/app/visit/page";
import { metadata as contactMetadata } from "@/app/contact/page";
import { metadata as giftCardsMetadata } from "@/app/gift-cards/page";
import { metadata as guidesMetadata } from "@/app/guides/page";
import { metadata as reviewsMetadata } from "@/app/reviews/page";
import { metadata as gettingItHomeMetadata } from "@/app/getting-it-home/page";

const ROUTES: ReadonlyArray<{
  name: string;
  metadata: Metadata;
  canonical: string;
}> = [
  { name: "/", metadata: homeMetadata, canonical: "/" },
  { name: "/about", metadata: aboutMetadata, canonical: "/about" },
  { name: "/visit", metadata: visitMetadata, canonical: "/visit" },
  { name: "/contact", metadata: contactMetadata, canonical: "/contact" },
  { name: "/gift-cards", metadata: giftCardsMetadata, canonical: "/gift-cards" },
  { name: "/guides", metadata: guidesMetadata, canonical: "/guides" },
  { name: "/reviews", metadata: reviewsMetadata, canonical: "/reviews" },
  {
    name: "/getting-it-home",
    metadata: gettingItHomeMetadata,
    canonical: "/getting-it-home",
  },
];

describe("cf-89fb: canonical alternates on the 8 static-metadata routes", () => {
  it.each(ROUTES)(
    "$name exports alternates.canonical = $canonical",
    ({ metadata, canonical }) => {
      expect(metadata.alternates?.canonical).toBeDefined();
      expect(String(metadata.alternates?.canonical)).toBe(canonical);
    },
  );

  it("every route uses a root-relative path so metadataBase resolves the host", () => {
    // metadataBase lives in layout.tsx (NEXT_PUBLIC_SITE_URL or the
    // production fallback). A canonical like `/about` resolves to
    // https://carolinafutons.com/about; an absolute URL bypasses
    // metadataBase and risks drift between staging + prod canonicals.
    for (const { name, metadata } of ROUTES) {
      const value = String(metadata.alternates?.canonical);
      expect(value.startsWith("/"), `${name}: canonical must be relative`).toBe(
        true,
      );
      expect(
        value.startsWith("http://") || value.startsWith("https://"),
        `${name}: canonical must not be absolute`,
      ).toBe(false);
    }
  });
});
