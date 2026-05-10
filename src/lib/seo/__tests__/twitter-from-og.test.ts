import { describe, it, expect } from "vitest";

import { twitterFromOpenGraph } from "@/lib/seo/twitter-from-og";

describe("twitterFromOpenGraph", () => {
  it("defaults card to summary_large_image", () => {
    const out = twitterFromOpenGraph({
      title: "T",
      description: "D",
      images: [{ url: "https://x/y.jpg" }],
    });
    expect(out).toMatchObject({ card: "summary_large_image" });
  });

  it("respects an explicit card override (summary)", () => {
    const out = twitterFromOpenGraph(
      { title: "T", description: "D" },
      "summary",
    );
    expect(out).toMatchObject({ card: "summary" });
  });

  it("mirrors title, description, and images from the openGraph block", () => {
    const og = {
      title: "Kingston Futon",
      description: "Solid hardwood futon frame",
      images: [{ url: "https://cdn.example/kingston.jpg", alt: "Kingston" }],
    };
    const out = twitterFromOpenGraph(og);
    expect(out).toMatchObject({
      card: "summary_large_image",
      title: "Kingston Futon",
      description: "Solid hardwood futon frame",
      images: [{ url: "https://cdn.example/kingston.jpg", alt: "Kingston" }],
    });
  });

  it("normalizes a single image into an array", () => {
    const out = twitterFromOpenGraph({
      title: "T",
      description: "D",
      images: { url: "https://x/y.jpg" },
    });
    expect(Array.isArray(out?.images)).toBe(true);
  });

  it("omits title/description/images when not provided on og", () => {
    const out = twitterFromOpenGraph({});
    expect(out).toEqual({ card: "summary_large_image" });
  });

  it("ignores fields that don't map to Twitter (type, url, publishedTime)", () => {
    const out = twitterFromOpenGraph({
      type: "article",
      title: "Post",
      description: "Body",
      url: "https://example.com/blog/x",
      publishedTime: "2026-01-01T00:00:00Z",
    });
    expect(out).not.toHaveProperty("type");
    expect(out).not.toHaveProperty("url");
    expect(out).not.toHaveProperty("publishedTime");
    expect(out).toMatchObject({ card: "summary_large_image", title: "Post", description: "Body" });
  });
});
