/**
 * cf-nm6p: BreadcrumbList JSON-LD on /guides + /guides/[slug].
 *
 * The shop/[category] PLP already emits Home > Shop > {category} via
 * `buildBreadcrumbSchema` + `<JsonLd id="jsonld-breadcrumb" .../>`. The
 * guides surfaces are the matching pair that the cf-5rmn SEO audit
 * flagged; this test pins their wiring against the same pattern so a
 * future refactor can't silently drop the breadcrumb without failing CI.
 *
 * Source-grep style (not rendered): we don't need to execute the page
 * component to verify the breadcrumb is wired. Asserting the source
 * contains the expected imports + the JsonLd callsite is faster, has
 * zero mock surface, and pins the contract against accidental removal.
 * Schema shape itself is already covered by `json-ld.test.ts`.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const GUIDES_INDEX = readFileSync(
  resolve(__dirname, "../app/guides/page.tsx"),
  "utf8",
);
const GUIDE_DETAIL = readFileSync(
  resolve(__dirname, "../app/guides/[slug]/page.tsx"),
  "utf8",
);

describe("/guides index — BreadcrumbList JSON-LD (cf-nm6p)", () => {
  it("imports buildBreadcrumbSchema + resolveSiteUrl from the SEO lib", () => {
    expect(GUIDES_INDEX).toMatch(
      /import\s*{[^}]*\bbuildBreadcrumbSchema\b[^}]*}\s*from\s*["']@\/lib\/seo\/json-ld["']/,
    );
    expect(GUIDES_INDEX).toMatch(
      /import\s*{[^}]*\bresolveSiteUrl\b[^}]*}\s*from\s*["']@\/lib\/seo\/json-ld["']/,
    );
  });

  it("imports the JsonLd component", () => {
    expect(GUIDES_INDEX).toMatch(
      /import\s*{\s*JsonLd\s*}\s*from\s*["']@\/components\/seo\/JsonLd["']/,
    );
  });

  it("renders <JsonLd id=\"jsonld-breadcrumb\" .../> matching the PLP convention", () => {
    expect(GUIDES_INDEX).toMatch(
      /<JsonLd\s+id="jsonld-breadcrumb"\s+schema={[^}]*}\s*\/>/,
    );
  });

  it("builds breadcrumb items for Home > Guides", () => {
    // Two ListItems: Home + Guides. Source must contain both names so a
    // copy-paste error renaming "Guides" to something else gets caught.
    expect(GUIDES_INDEX).toMatch(/name:\s*["']Home["']/);
    expect(GUIDES_INDEX).toMatch(/name:\s*["']Guides["']/);
    // The Guides crumb URL must be absolute (siteUrl-prefixed) — Google's
    // BreadcrumbList rich-result eligibility requires absolute URLs in
    // the `item` field.
    expect(GUIDES_INDEX).toMatch(/\$\{siteUrl\}\/guides/);
  });
});

describe("/guides/[slug] detail — BreadcrumbList JSON-LD (cf-nm6p)", () => {
  it("imports buildBreadcrumbSchema + resolveSiteUrl from the SEO lib", () => {
    expect(GUIDE_DETAIL).toMatch(
      /import\s*{[^}]*\bbuildBreadcrumbSchema\b[^}]*}\s*from\s*["']@\/lib\/seo\/json-ld["']/,
    );
    expect(GUIDE_DETAIL).toMatch(
      /import\s*{[^}]*\bresolveSiteUrl\b[^}]*}\s*from\s*["']@\/lib\/seo\/json-ld["']/,
    );
  });

  it("imports the JsonLd component", () => {
    expect(GUIDE_DETAIL).toMatch(
      /import\s*{\s*JsonLd\s*}\s*from\s*["']@\/components\/seo\/JsonLd["']/,
    );
  });

  it("renders <JsonLd id=\"jsonld-breadcrumb\" .../> matching the PLP convention", () => {
    expect(GUIDE_DETAIL).toMatch(
      /<JsonLd\s+id="jsonld-breadcrumb"\s+schema={[^}]*}\s*\/>/,
    );
  });

  it("builds breadcrumb items for Home > Guides > {guide.title}", () => {
    expect(GUIDE_DETAIL).toMatch(/name:\s*["']Home["']/);
    expect(GUIDE_DETAIL).toMatch(/name:\s*["']Guides["']/);
    // Detail page must use guide.title (dynamic from the loaded guide),
    // NOT a hardcoded string — a typo'd "guide.name" would silently
    // surface as undefined in the rendered schema.
    expect(GUIDE_DETAIL).toMatch(/name:\s*guide\.title/);
    // Absolute URLs for both /guides and /guides/<slug>.
    expect(GUIDE_DETAIL).toMatch(/\$\{siteUrl\}\/guides/);
    expect(GUIDE_DETAIL).toMatch(/\$\{siteUrl\}\/guides\/\$\{(guide\.slug|slug)\}/);
  });
});
