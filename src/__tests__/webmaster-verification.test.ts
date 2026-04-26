import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveVerification } from "@/lib/seo/webmaster-verification";

const ORIG_GOOGLE = process.env.GOOGLE_SITE_VERIFICATION;
const ORIG_BING = process.env.BING_SITE_VERIFICATION;

beforeEach(() => {
  delete process.env.GOOGLE_SITE_VERIFICATION;
  delete process.env.BING_SITE_VERIFICATION;
});

afterEach(() => {
  process.env.GOOGLE_SITE_VERIFICATION = ORIG_GOOGLE;
  process.env.BING_SITE_VERIFICATION = ORIG_BING;
});

describe("resolveVerification()", () => {
  it("returns undefined when neither env var is set", () => {
    expect(resolveVerification()).toBeUndefined();
  });

  it("returns { google } when only GOOGLE_SITE_VERIFICATION is set", () => {
    process.env.GOOGLE_SITE_VERIFICATION = "abc123";
    const v = resolveVerification();
    expect(v?.google).toBe("abc123");
    expect(v).not.toHaveProperty("other");
  });

  it("returns { other.msvalidate.01 } when only BING_SITE_VERIFICATION is set", () => {
    process.env.BING_SITE_VERIFICATION = "bing456";
    const v = resolveVerification();
    expect(v?.other?.["msvalidate.01"]).toBe("bing456");
    expect(v).not.toHaveProperty("google");
  });

  it("returns both keys when both env vars are set", () => {
    process.env.GOOGLE_SITE_VERIFICATION = "gsc-token";
    process.env.BING_SITE_VERIFICATION = "bing-token";
    const v = resolveVerification();
    expect(v?.google).toBe("gsc-token");
    expect(v?.other?.["msvalidate.01"]).toBe("bing-token");
  });

  it("treats empty string as unset (no empty verification tags emitted)", () => {
    process.env.GOOGLE_SITE_VERIFICATION = "";
    process.env.BING_SITE_VERIFICATION = "";
    expect(resolveVerification()).toBeUndefined();
  });
});
