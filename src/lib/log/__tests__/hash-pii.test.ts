// cfw-coc: hash-pii contract tests.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// hash-pii is dynamically imported inside each test (via vi.resetModules)
// so salt-rotation cases see the freshly-evaluated module.

describe("hashPii", () => {
  const ORIGINAL_SALT = process.env.LOG_PII_SALT;

  beforeEach(() => {
    process.env.LOG_PII_SALT = "test-salt-cfw-coc";
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIGINAL_SALT === undefined) delete process.env.LOG_PII_SALT;
    else process.env.LOG_PII_SALT = ORIGINAL_SALT;
    vi.restoreAllMocks();
  });

  it("returns a 12-char hex string for any non-empty input", async () => {
    const { hashPii: fresh } = await import("../hash-pii");
    const out = fresh("anything");
    expect(out).toMatch(/^[0-9a-f]{12}$/);
  });

  it("is deterministic for the same input + salt (logs correlate)", async () => {
    const { hashPii: fresh } = await import("../hash-pii");
    const a = fresh("user@example.com");
    const b = fresh("user@example.com");
    expect(a).toBe(b);
  });

  it("differs for different inputs (no trivial collisions on neighboring strings)", async () => {
    const { hashPii: fresh } = await import("../hash-pii");
    expect(fresh("user@example.com")).not.toBe(fresh("user@example.org"));
    expect(fresh("a")).not.toBe(fresh("b"));
  });

  it("differs when the salt rotates (deploy-scoped reversibility)", async () => {
    process.env.LOG_PII_SALT = "salt-A";
    const { hashPii: fresh1 } = await import("../hash-pii");
    const a = fresh1("user@example.com");

    vi.resetModules();
    process.env.LOG_PII_SALT = "salt-B";
    const { hashPii: fresh2 } = await import("../hash-pii");
    const b = fresh2("user@example.com");

    expect(a).not.toBe(b);
  });

  it("returns <unsalted> sentinel when LOG_PII_SALT is not set", async () => {
    delete process.env.LOG_PII_SALT;
    vi.resetModules();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { hashPii: fresh } = await import("../hash-pii");

    expect(fresh("user@example.com")).toBe("<unsalted>");
    expect(warn).toHaveBeenCalledOnce();
    // second call does not re-warn (warns once per process).
    fresh("another@example.com");
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe("hashEmail", () => {
  beforeEach(() => {
    process.env.LOG_PII_SALT = "test-salt-cfw-coc";
    vi.resetModules();
  });

  it("normalizes case + whitespace so address-equivalent inputs correlate", async () => {
    const { hashEmail: fresh } = await import("../hash-pii");
    expect(fresh("User@Example.com")).toBe(fresh("user@example.com"));
    expect(fresh("  user@example.com  ")).toBe(fresh("user@example.com"));
  });

  it("delegates to hashPii (12-char hex)", async () => {
    const { hashEmail: fresh } = await import("../hash-pii");
    expect(fresh("user@example.com")).toMatch(/^[0-9a-f]{12}$/);
  });
});
