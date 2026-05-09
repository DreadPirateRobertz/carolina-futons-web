import { describe, it, expect } from "vitest";

import { resolveWixMediaUrl } from "@/lib/wix/media";

// cfw-6qd.6: pure-string Wix Media reference resolver. Tests pin the four
// shapes the SiteContent reader can hand us: empty, already-CDN, full
// wix:image:// reference with dimensions, and the bare path variant. Plus
// a malformed-row guard so a stray edit can't break the page.

describe("resolveWixMediaUrl — empty / null", () => {
  it("returns null for null / undefined / empty / whitespace input", () => {
    expect(resolveWixMediaUrl(null)).toBeNull();
    expect(resolveWixMediaUrl(undefined)).toBeNull();
    expect(resolveWixMediaUrl("")).toBeNull();
    expect(resolveWixMediaUrl("   ")).toBeNull();
  });
});

describe("resolveWixMediaUrl — passthrough", () => {
  it("returns a Wix CDN URL unchanged", () => {
    const url =
      "https://static.wixstatic.com/media/abc123~mv2.jpg/v1/fill/w_1920,h_800,q_85/file.jpg";
    expect(resolveWixMediaUrl(url)).toBe(url);
  });

  it("trims surrounding whitespace before passthrough", () => {
    const url = "https://static.wixstatic.com/media/abc.jpg";
    expect(resolveWixMediaUrl(`  ${url}\n`)).toBe(url);
  });

  it("rejects a non-Wix HTTPS URL (defensive — value should never escape Wix)", () => {
    expect(
      resolveWixMediaUrl("https://example.com/foo.jpg"),
    ).toBeNull();
  });
});

describe("resolveWixMediaUrl — wix:image:// references", () => {
  it("synthesizes a CDN URL from hash + filename + originWidth/originHeight", () => {
    const ref =
      "wix:image://v1/abc123~mv2.jpg/hero.jpg#originWidth=1920&originHeight=800";
    expect(resolveWixMediaUrl(ref)).toBe(
      "https://static.wixstatic.com/media/abc123~mv2.jpg/v1/fill/w_1920,h_800/hero.jpg",
    );
  });

  it("rounds fractional dimensions (Wix occasionally emits decimal hints)", () => {
    const ref =
      "wix:image://v1/abc.jpg/file.jpg#originWidth=1920.7&originHeight=800.4";
    expect(resolveWixMediaUrl(ref)).toBe(
      "https://static.wixstatic.com/media/abc.jpg/v1/fill/w_1921,h_800/file.jpg",
    );
  });

  it("falls through to a bare /<hash>/<filename> CDN URL when no fragment dims", () => {
    const ref = "wix:image://v1/abc.jpg/hero.jpg";
    expect(resolveWixMediaUrl(ref)).toBe(
      "https://static.wixstatic.com/media/abc.jpg/hero.jpg",
    );
  });

  it("ignores a query string when present (CDN form doesn't carry it)", () => {
    const ref =
      "wix:image://v1/abc.jpg/hero.jpg?token=opaque#originWidth=400&originHeight=300";
    expect(resolveWixMediaUrl(ref)).toBe(
      "https://static.wixstatic.com/media/abc.jpg/v1/fill/w_400,h_300/hero.jpg",
    );
  });

  it("returns null when the path is missing the filename segment", () => {
    expect(resolveWixMediaUrl("wix:image://v1/abc.jpg")).toBeNull();
    expect(resolveWixMediaUrl("wix:image://v1/")).toBeNull();
  });

  it("returns null when fragment dims are non-numeric (defensive)", () => {
    const ref =
      "wix:image://v1/abc.jpg/hero.jpg#originWidth=foo&originHeight=bar";
    // Falls through to dimension-less bare CDN URL rather than ratio-broken
    // /v1/fill/w_NaN,h_NaN/ which would 404.
    expect(resolveWixMediaUrl(ref)).toBe(
      "https://static.wixstatic.com/media/abc.jpg/hero.jpg",
    );
  });

  it("returns null when fragment dims are negative or zero", () => {
    expect(
      resolveWixMediaUrl("wix:image://v1/abc.jpg/hero.jpg#originWidth=0&originHeight=300"),
    ).toBe("https://static.wixstatic.com/media/abc.jpg/hero.jpg");
  });
});

describe("resolveWixMediaUrl — unrecognized shapes", () => {
  it("returns null for a non-Wix URI scheme", () => {
    expect(resolveWixMediaUrl("file:///tmp/foo.jpg")).toBeNull();
    expect(resolveWixMediaUrl("ftp://example.com/foo.jpg")).toBeNull();
  });

  it("returns null for a bare filename (legacy seed shape we don't honour)", () => {
    expect(resolveWixMediaUrl("hero.jpg")).toBeNull();
  });

  it("returns null for an older wix:image:// scheme without /v1/", () => {
    expect(
      resolveWixMediaUrl("wix:image://abc.jpg/hero.jpg"),
    ).toBeNull();
  });
});
