import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildAuthDiag,
  diagAuthorized,
  envByteSummary,
  runtimeSummary,
} from "@/lib/auth/diag";

describe("envByteSummary", () => {
  const KEY = "__CFW_TEST_BYTE_SUM__";
  beforeEach(() => {
    delete process.env[KEY];
  });
  afterEach(() => {
    delete process.env[KEY];
  });

  it("returns null when env var is unset", () => {
    expect(envByteSummary(KEY)).toBeNull();
  });

  it("captures length, prefix4, suffix4 for a normal value", () => {
    process.env[KEY] = "abcdefghijklmnop";
    const sum = envByteSummary(KEY);
    expect(sum).not.toBeNull();
    expect(sum!.length).toBe(16);
    expect(sum!.prefix4).toBe("abcd");
    expect(sum!.suffix4).toBe("mnop");
  });

  // cfw-hb3: a hidden char inside the body would survive the env loader's
  // trim() — hex8 columns surface those exact bytes for byte-vs-byte compare.
  it("hex-encodes prefix and suffix bytes so invisible chars (ZWSP, NBSP, BOM) show up", () => {
    // Zero-width space (U+200B) wedged at index 1; surrounding chars are ASCII.
    const value = "a​bcdefghij";
    process.env[KEY] = value;
    const sum = envByteSummary(KEY)!;
    expect(sum.length).toBe(value.length);
    // ZWSP is e2 80 8b in UTF-8 — must appear in the prefix hex
    expect(sum.hex8Prefix).toContain("e2808b");
  });

  it("handles short values (length < 8) without overrunning", () => {
    process.env[KEY] = "abc";
    const sum = envByteSummary(KEY)!;
    expect(sum.length).toBe(3);
    expect(sum.prefix4).toBe("abc");
    expect(sum.suffix4).toBe("abc");
    // Empty hex spans are fine
    expect(typeof sum.hex8Prefix).toBe("string");
    expect(typeof sum.hex8Suffix).toBe("string");
  });
});

describe("runtimeSummary", () => {
  it("includes nodeVersion and a runtime tag", () => {
    const r = runtimeSummary();
    expect(r.nodeVersion).toMatch(/^v\d+\./);
    expect(typeof r.runtime).toBe("string");
  });

  it("surfaces VERCEL_ENV / VERCEL_REGION / VERCEL_DEPLOYMENT_ID when present", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_REGION = "iad1";
    process.env.VERCEL_DEPLOYMENT_ID = "dpl_abc";
    try {
      const r = runtimeSummary();
      expect(r.vercelEnv).toBe("preview");
      expect(r.vercelRegion).toBe("iad1");
      expect(r.vercelDeploymentId).toBe("dpl_abc");
    } finally {
      delete process.env.VERCEL_ENV;
      delete process.env.VERCEL_REGION;
      delete process.env.VERCEL_DEPLOYMENT_ID;
    }
  });
});

describe("diagAuthorized", () => {
  beforeEach(() => {
    delete process.env.WIX_AUTH_DEBUG_TOKEN;
  });

  function reqWith(token: string | null) {
    const headers = new Map<string, string>();
    if (token !== null) headers.set("x-debug-token", token);
    return {
      headers: { get: (k: string) => headers.get(k.toLowerCase()) ?? null },
    } as unknown as Parameters<typeof diagAuthorized>[0];
  }

  it("denies when WIX_AUTH_DEBUG_TOKEN is unset", () => {
    expect(diagAuthorized(reqWith("anything"))).toBe(false);
  });

  it("denies when token header missing", () => {
    process.env.WIX_AUTH_DEBUG_TOKEN = "secret-token";
    expect(diagAuthorized(reqWith(null))).toBe(false);
  });

  it("denies when token mismatches", () => {
    process.env.WIX_AUTH_DEBUG_TOKEN = "secret-token";
    expect(diagAuthorized(reqWith("wrong-token"))).toBe(false);
  });

  it("denies when length differs (defends against timing oracle)", () => {
    process.env.WIX_AUTH_DEBUG_TOKEN = "secret-token";
    expect(diagAuthorized(reqWith("secret-tok"))).toBe(false);
  });

  it("authorises an exact match", () => {
    process.env.WIX_AUTH_DEBUG_TOKEN = "secret-token";
    expect(diagAuthorized(reqWith("secret-token"))).toBe(true);
  });
});

describe("buildAuthDiag", () => {
  it("flattens an Error into message+name", () => {
    const err = new TypeError("boom");
    const d = buildAuthDiag(err);
    expect(d.err.message).toBe("boom");
    expect(d.err.name).toBe("TypeError");
    expect(d.err.code).toBeUndefined();
  });

  it("extracts SDK error code + httpStatus when present", () => {
    const sdkErr = {
      message: "Wix said no",
      code: "INVALID_ARGUMENT",
      response: { status: 400 },
    };
    const d = buildAuthDiag(sdkErr);
    expect(d.err.code).toBe("INVALID_ARGUMENT");
    expect(d.err.httpStatus).toBe(400);
  });

  it("includes runtime summary block", () => {
    const d = buildAuthDiag(new Error("x"));
    expect(d.runtime.nodeVersion).toMatch(/^v\d+\./);
  });
});
