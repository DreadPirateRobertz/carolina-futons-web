import { test, expect } from "@playwright/test";

// Phase 2 scaffold: /api/auth/session is a 501 stub that rennala replaces in
// cf-3qt.3 (Wix Members OAuth). These tests pin the 501-stub contract so the
// swap to a real implementation is a visible diff, not a silent regression.
//
// When rennala lands OAuth, flip these tests to the real shape instead of
// deleting them — coverage for the auth surface should grow, not disappear.

test.describe("/api/auth/session (stub contract)", () => {
  for (const method of ["GET", "POST", "DELETE"] as const) {
    test(`${method} returns 501 with { ok: false, error }`, async ({
      request,
    }) => {
      const res = await request.fetch("/api/auth/session", { method });
      expect(res.status()).toBe(501);
      const body = (await res.json()) as {
        ok: boolean;
        error: string;
        message?: string;
      };
      expect(body.ok).toBe(false);
      expect(body.error).toBe("not-implemented");
      expect(typeof body.message).toBe("string");
    });
  }

  test("response is JSON with no-cache semantics (force-dynamic)", async ({
    request,
  }) => {
    const res = await request.get("/api/auth/session");
    expect(res.headers()["content-type"]).toMatch(/application\/json/);
    // force-dynamic + 501 stubs must not be cached by intermediaries while the
    // real impl is pending, or a cached 501 would survive the rennala rollout.
    const cacheControl = res.headers()["cache-control"] ?? "";
    expect(cacheControl).not.toMatch(/s-maxage=[1-9]/);
  });
});
