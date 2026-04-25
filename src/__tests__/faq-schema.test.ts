import { describe, it, expect } from "vitest";

import { buildFaqPageSchema } from "@/lib/seo/json-ld";

// cf-3qt.4.1: FAQPage schema builder.
//
// Contract per https://schema.org/FAQPage and Google's rich-result
// docs: each Question must have exactly one acceptedAnswer with type
// Answer. The shape produced here is what Search Console accepts for
// rich-result eligibility.

describe("buildFaqPageSchema", () => {
  it("emits one Question per entry with a single acceptedAnswer", () => {
    const schema = buildFaqPageSchema([
      { question: "Q1", answer: "A1" },
      { question: "Q2", answer: "A2" },
    ]);
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity).toHaveLength(2);
    expect(schema.mainEntity[0]).toEqual({
      "@type": "Question",
      name: "Q1",
      acceptedAnswer: { "@type": "Answer", text: "A1" },
    });
  });

  it("returns an empty mainEntity for an empty input list", () => {
    const schema = buildFaqPageSchema([]);
    expect(schema.mainEntity).toEqual([]);
  });
});
