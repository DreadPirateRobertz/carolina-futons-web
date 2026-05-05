import { describe, it, expect } from "vitest";
import {
  getRecommendation,
  SOMMELIER_QUESTIONS,
} from "@/lib/quiz/futon-sommelier-data";

describe("SOMMELIER_QUESTIONS", () => {
  it("has exactly 4 questions", () => {
    expect(SOMMELIER_QUESTIONS).toHaveLength(4);
  });

  it("each question has at least 2 options", () => {
    for (const q of SOMMELIER_QUESTIONS) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("getRecommendation — nightly sleepers", () => {
  it("recommends mattresses for nightly + firm", () => {
    const rec = getRecommendation({ sleepFrequency: "nightly", firmness: "firm" });
    expect(rec.categorySlug).toBe("mattresses");
    expect(rec.reason).toMatch(/innerspring/i);
  });

  it("recommends mattresses for nightly + soft", () => {
    const rec = getRecommendation({ sleepFrequency: "nightly", firmness: "soft" });
    expect(rec.categorySlug).toBe("mattresses");
    expect(rec.reason).toMatch(/natural|cotton/i);
  });

  it("recommends mattresses for nightly + medium", () => {
    const rec = getRecommendation({ sleepFrequency: "nightly", firmness: "medium" });
    expect(rec.categorySlug).toBe("mattresses");
  });
});

describe("getRecommendation — contemporary style", () => {
  it("recommends platform-beds for contemporary frame style (non-nightly)", () => {
    const rec = getRecommendation({
      sleepFrequency: "occasional",
      frameStyle: "contemporary",
    });
    expect(rec.categorySlug).toBe("platform-beds");
    expect(rec.reason).toMatch(/platform/i);
  });
});

describe("getRecommendation — futon frames", () => {
  it("recommends futon-frames for natural wood + full + occasional", () => {
    const rec = getRecommendation({
      sleepFrequency: "occasional",
      firmness: "medium",
      frameStyle: "natural",
      size: "full",
    });
    expect(rec.categorySlug).toBe("futon-frames");
    expect(rec.reason).toMatch(/full-size|futon/i);
  });

  it("recommends futon-frames for dark stain + queen", () => {
    const rec = getRecommendation({
      sleepFrequency: "frequent",
      frameStyle: "dark",
      size: "queen",
    });
    expect(rec.categorySlug).toBe("futon-frames");
    expect(rec.reason).toMatch(/queen-size/i);
  });
});

describe("getRecommendation — empty answers", () => {
  it("returns a valid recommendation even with no answers (default fallback)", () => {
    const rec = getRecommendation({});
    expect(rec.categorySlug).toBeTruthy();
    expect(rec.reason).toBeTruthy();
  });
});
