import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { GET } from "@/app/api/health/route";

describe("/api/health", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T03:00:00.000Z"));
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
    expect(body.ts).toBe("2026-05-10T03:00:00.000Z");
  });

  it("reports VERCEL_ENV when set", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const res = GET();
    const body = await res.json();
    expect(body.env).toBe("production");
  });

  it("falls back to NODE_ENV when VERCEL_ENV is not set", async () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "test");
    const res = GET();
    const body = await res.json();
    expect(body.env).toBe("test");
  });

  it("reports 'unknown' when neither env var is set", async () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "");
    const res = GET();
    const body = await res.json();
    expect(body.env).toBe("unknown");
  });

  it("response is JSON content-type", () => {
    const res = GET();
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
  });
});
