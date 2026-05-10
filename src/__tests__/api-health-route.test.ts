import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { GET } from "@/app/api/health/route";

describe("/api/health", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T08:30:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("returns 200 with status:ok", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it("includes an ISO-8601 timestamp", async () => {
    const res = GET();
    const body = await res.json();
    expect(body.timestamp).toBe("2026-05-10T08:30:00.000Z");
  });

  it("reports VERCEL_GIT_COMMIT_SHA as version when set", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abc1234deadbeef");
    const res = GET();
    const body = await res.json();
    expect(body.version).toBe("abc1234deadbeef");
  });

  it("falls back to npm_package_version when VERCEL_GIT_COMMIT_SHA empty", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
    vi.stubEnv("npm_package_version", "1.2.3");
    const res = GET();
    const body = await res.json();
    expect(body.version).toBe("1.2.3");
  });

  it("reports 'unknown' when neither env var is set", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
    vi.stubEnv("npm_package_version", "");
    const res = GET();
    const body = await res.json();
    expect(body.version).toBe("unknown");
  });

  it("response is JSON content-type", () => {
    const res = GET();
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
  });

  it("emits Cache-Control: no-store so monitors never see a cached body", () => {
    const res = GET();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("body schema is exactly the documented contract — three fields, no more", async () => {
    const res = GET();
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["status", "timestamp", "version"]);
  });
});
