import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { JsonLd } from "@/components/seo/JsonLd";

// The JsonLd primitive wraps `<script type="application/ld+json">` with
// the schema JSON as its text body. Tests pin: (1) the script element is
// rendered with the correct MIME type, (2) the text content round-trips
// through JSON.parse back to the original object (i.e. React didn't
// HTML-escape the JSON on the way in), (3) the schema object structure
// survives through all types supported by JSON-LD.

describe("JsonLd", () => {
  it("renders a <script type=\"application/ld+json\"> element", () => {
    const { container } = render(
      <JsonLd schema={{ "@context": "https://schema.org", "@type": "Thing" }} />,
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
  });

  it("round-trips the schema object through JSON.parse without HTML-escaping", () => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Kingston Futon",
      offers: {
        "@type": "Offer",
        price: "899.00",
        availability: "https://schema.org/InStock",
      },
    };
    const { container } = render(<JsonLd schema={schema} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const text = script?.textContent ?? "";
    expect(() => JSON.parse(text)).not.toThrow();
    expect(JSON.parse(text)).toEqual(schema);
  });

  it("applies an optional id so Next.js hydration can reconcile the script", () => {
    const { container } = render(
      <JsonLd id="jsonld-org" schema={{ "@type": "Organization" }} />,
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script?.getAttribute("id")).toBe("jsonld-org");
  });
});
