// cfw-gfx: coverage for src/lib/discovery/customer-video-reviews.ts
// (cf-ou66.3 / cfw-9zp). The slug-filtered subset reader for the per-PDP
// video-review grid. Fixture is empty today (CMS not yet provisioned)
// but the function takes an injectable pool, so test coverage doesn't
// need to seed global state.

import { describe, it, expect } from "vitest";

import {
  CUSTOMER_VIDEO_REVIEWS,
  getCustomerVideoReviewsByProductSlug,
  type CustomerVideoReview,
} from "@/lib/discovery/customer-video-reviews";

const KINGSTON_YT: CustomerVideoReview = {
  id: "vid-kingston-1",
  productSlug: "kingston",
  author: "B. Smith",
  rating: 5,
  caption: "Two years in, still love it.",
  date: "2025-09-01",
  source: "youtube",
  videoUrl: "https://youtu.be/abc123",
  embedUrl: "https://www.youtube.com/embed/abc123?autoplay=1&rel=0",
  posterUrl: "https://example.com/poster1.jpg",
};

const KINGSTON_MP4: CustomerVideoReview = {
  id: "vid-kingston-2",
  productSlug: "kingston",
  author: "L. Jones",
  caption: "Quick assembly demo.",
  date: "2025-10-15",
  source: "mp4",
  videoUrl: "https://example.com/clip.mp4",
  posterUrl: "https://example.com/poster2.jpg",
};

const SOLSTICE: CustomerVideoReview = {
  id: "vid-solstice-1",
  productSlug: "solstice",
  author: "M. Patel",
  caption: "Living-room vignette.",
  date: "2025-08-20",
  source: "youtube",
  videoUrl: "https://youtu.be/def456",
  embedUrl: "https://www.youtube.com/embed/def456?autoplay=1&rel=0",
  posterUrl: "https://example.com/poster3.jpg",
};

const POOL: CustomerVideoReview[] = [KINGSTON_YT, SOLSTICE, KINGSTON_MP4];

describe("CUSTOMER_VIDEO_REVIEWS fixture", () => {
  it("is empty by default (CMS not yet provisioned)", () => {
    // Pinned because the function falls back to this constant when no
    // pool is passed — a stray entry would silently leak into every
    // PDP's grid.
    expect(CUSTOMER_VIDEO_REVIEWS).toEqual([]);
  });
});

describe("getCustomerVideoReviewsByProductSlug", () => {
  it("returns [] when the pool is empty", () => {
    expect(getCustomerVideoReviewsByProductSlug("kingston", [])).toEqual([]);
  });

  it("defaults to the empty fixture when no pool is passed (real-call shape)", () => {
    expect(getCustomerVideoReviewsByProductSlug("kingston")).toEqual([]);
  });

  it("returns [] for an empty slug (defensive — no global match)", () => {
    expect(getCustomerVideoReviewsByProductSlug("", POOL)).toEqual([]);
  });

  it("returns [] when no entry matches the slug", () => {
    expect(getCustomerVideoReviewsByProductSlug("not-a-real-slug", POOL)).toEqual([]);
  });

  it("returns a single match when exactly one entry matches", () => {
    expect(getCustomerVideoReviewsByProductSlug("solstice", POOL)).toEqual([
      SOLSTICE,
    ]);
  });

  it("returns all matches and preserves the pool's input order", () => {
    // POOL order: [KINGSTON_YT, SOLSTICE, KINGSTON_MP4]
    // For slug 'kingston' the YT entry is at index 0, MP4 at index 2 —
    // a sort-side effect (e.g. by date) would put MP4 (Oct 2025) before
    // YT (Sep 2025), inverting the documented order.
    expect(getCustomerVideoReviewsByProductSlug("kingston", POOL)).toEqual([
      KINGSTON_YT,
      KINGSTON_MP4,
    ]);
  });

  it("does exact-equality matching, NOT substring (kingston-twin must NOT match kingston)", () => {
    const richer: CustomerVideoReview[] = [
      ...POOL,
      { ...KINGSTON_YT, id: "kt-twin", productSlug: "kingston-twin" },
    ];
    const out = getCustomerVideoReviewsByProductSlug("kingston", richer);
    expect(out).toHaveLength(2);
    expect(out.map((v) => v.productSlug)).toEqual(["kingston", "kingston"]);
  });

  it("is case-sensitive — uppercase slug does not match lowercase row", () => {
    expect(getCustomerVideoReviewsByProductSlug("KINGSTON", POOL)).toEqual([]);
  });

  it("does not mutate the input pool", () => {
    const before = JSON.parse(JSON.stringify(POOL));
    getCustomerVideoReviewsByProductSlug("kingston", POOL);
    expect(POOL).toEqual(before);
  });

  it("returns a NEW array (Array.filter contract) — caller can mutate without touching the source", () => {
    const out = getCustomerVideoReviewsByProductSlug("kingston", POOL);
    expect(out).not.toBe(POOL);
    // Items inside are still the same references — that's the standard
    // .filter behaviour and matches the function's intent.
    expect(out[0]).toBe(KINGSTON_YT);
  });

  it("preserves both 'youtube' and 'mp4' source variants in the output", () => {
    const out = getCustomerVideoReviewsByProductSlug("kingston", POOL);
    const sources = out.map((v) => v.source).sort();
    expect(sources).toEqual(["mp4", "youtube"]);
  });
});
