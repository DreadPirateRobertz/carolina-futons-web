/**
 * cfw-62f: Auth API smoke tests — regression guard for the cfw-hb3 502 issue.
 *
 * These are API-level tests (request fixture, no browser UI) that verify the
 * /api/auth/register and /api/auth/login routes connect to the Wix SDK and
 * return valid HTTP status codes on the deployed Vercel runtime.
 *
 * The key invariant: neither endpoint may return 502. A 502 indicates the Wix
 * SDK threw unexpectedly (cold-start timeout, env var encoding drift, etc.) —
 * the failure mode cfw-hb3 diagnosed. A 401/409/200 means the SDK connected
 * to Wix and got a meaningful response.
 *
 * Run against Vercel preview:
 *   BASE_URL=https://carolina-futons-web.vercel.app npx playwright test e2e/auth-smoke.spec.ts
 */

import { test, expect } from "@playwright/test";

// Fixed reserved-for-smoke-testing account — already registered in Wix so
// /api/auth/register reliably returns 409 (emailAlreadyExists) without
// creating throwaway accounts on every run.
const SMOKE_EMAIL = "halworker85+cfw-hb3@gmail.com";
const SMOKE_WRONG_PASSWORD = "definitely-wrong-password-12345";

test.describe("/api/auth/register — smoke (cfw-62f)", () => {
  test("returns 200 or 409 — not 502 (Wix SDK connected)", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/register", {
      data: { email: SMOKE_EMAIL, password: SMOKE_WRONG_PASSWORD },
    });
    expect(res.status()).not.toBe(502);
    expect([200, 409, 422]).toContain(res.status());
  });

  test("409 body contains a user-facing error string (no raw SDK leak)", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/register", {
      data: { email: SMOKE_EMAIL, password: SMOKE_WRONG_PASSWORD },
    });
    if (res.status() === 409) {
      const body = (await res.json()) as { error?: string };
      expect(typeof body.error).toBe("string");
      expect(body.error!.length).toBeGreaterThan(0);
    } else {
      // 200 or 422 — both valid non-502 outcomes
      expect([200, 422]).toContain(res.status());
    }
  });
});

test.describe("/api/auth/login — smoke (cfw-62f)", () => {
  test("wrong credentials return 401 — not 502 (Wix SDK connected)", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: SMOKE_EMAIL, password: SMOKE_WRONG_PASSWORD },
    });
    expect(res.status()).not.toBe(502);
    expect(res.status()).toBe(401);
  });

  test("401 body contains a user-facing error string", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: SMOKE_EMAIL, password: SMOKE_WRONG_PASSWORD },
    });
    const body = (await res.json()) as { error?: string };
    expect(typeof body.error).toBe("string");
    expect(body.error!.length).toBeGreaterThan(0);
  });

  test("missing body returns 400 — not 502", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: {},
    });
    expect(res.status()).not.toBe(502);
    expect(res.status()).toBe(400);
  });
});
