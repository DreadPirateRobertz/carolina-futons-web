/**
 * cf-wvgk: static blog posts — port 15 markdown posts from content/blog/
 * into cfw as static fallback data for when Wix Blog CMS is empty.
 */
import { describe, expect, it } from "vitest";
import {
  STATIC_BLOG_POSTS,
  getStaticPostBySlug,
} from "@/lib/blog/static-posts";

const REQUIRED_SLUGS = [
  "best-futons-for-everyday-sleeping",
  "casegoods-accessories-guide",
  "futon-care-guide",
  "futon-covers-fabrics-guide",
  "futon-for-guest-room",
  "futon-frame-buying-guide",
  "futon-vs-sofa-bed",
  "how-to-choose-futon-mattress",
  "how-to-clean-futon-mattress",
  "mountain-living-furniture",
  "murphy-bed-vs-futon",
  "murphy-cabinet-beds-buying-guide",
  "platform-bed-guide",
  "small-space-furniture-guide",
  "wall-hugger-futons-buying-guide",
];

describe("STATIC_BLOG_POSTS", () => {
  it("contains exactly 15 posts", () => {
    expect(STATIC_BLOG_POSTS).toHaveLength(15);
  });

  it("contains all required slugs", () => {
    const slugs = STATIC_BLOG_POSTS.map((p) => p.slug);
    for (const slug of REQUIRED_SLUGS) {
      expect(slugs).toContain(slug);
    }
  });

  it("every post has a non-empty slug", () => {
    for (const post of STATIC_BLOG_POSTS) {
      expect(post.slug.trim()).toBeTruthy();
    }
  });

  it("every post has a non-empty title", () => {
    for (const post of STATIC_BLOG_POSTS) {
      expect(post.title.trim()).toBeTruthy();
    }
  });

  it("every post has a non-empty excerpt", () => {
    for (const post of STATIC_BLOG_POSTS) {
      expect(post.excerpt.trim()).toBeTruthy();
    }
  });

  it("every post has a positive minutesToRead", () => {
    for (const post of STATIC_BLOG_POSTS) {
      expect(post.minutesToRead).toBeGreaterThan(0);
    }
  });

  it("every post has a non-empty metaDescription", () => {
    for (const post of STATIC_BLOG_POSTS) {
      expect(post.metaDescription.trim()).toBeTruthy();
    }
  });

  it("every post has a non-null firstPublishedDate", () => {
    for (const post of STATIC_BLOG_POSTS) {
      expect(post.firstPublishedDate).toBeInstanceOf(Date);
    }
  });

  it("no two posts share the same slug", () => {
    const slugs = STATIC_BLOG_POSTS.map((p) => p.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });
});

describe("getStaticPostBySlug", () => {
  it("returns the post for a known slug", () => {
    const post = getStaticPostBySlug("futon-vs-sofa-bed");
    expect(post).not.toBeNull();
    expect(post!.slug).toBe("futon-vs-sofa-bed");
  });

  it("returns undefined for an unknown slug", () => {
    const post = getStaticPostBySlug("does-not-exist");
    expect(post).toBeUndefined();
  });

  it("returned post has contentText with substantial content", () => {
    const post = getStaticPostBySlug("futon-frame-buying-guide");
    expect(post!.contentText.length).toBeGreaterThan(500);
  });
});
