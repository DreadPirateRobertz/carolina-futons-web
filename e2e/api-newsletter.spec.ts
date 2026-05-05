/**
 * /api/newsletter E2E — cfw-98s
 *
 * Hits the route directly via Playwright's request fixture so we exercise
 * the wire contract end-to-end without depending on the home/footer form
 * UI (covered separately by home-newsletter.spec.ts). When the test runs
 * against a deploy that has WIX_VELO_SITE_URL set, the duplicate path
 * round-trips through Velo; against a CI build without the env var the
 * route soft-acks every valid email — that's the documented fallback,
 * not a regression.
 */

import { test, expect } from "@playwright/test";

test.describe("/api/newsletter — wire contract", () => {
  test("happy path: returns ok:true for a valid email", async ({ request }) => {
    const res = await request.post("/api/newsletter", {
      data: { email: `e2e+${Date.now()}@example.com` },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  test("duplicate email: still returns ok (alreadySubscribed flag carries the signal)", async ({
    request,
  }) => {
    const email = `e2e+dup-${Date.now()}@example.com`;
    const first = await request.post("/api/newsletter", { data: { email } });
    expect(first.status()).toBe(200);

    const second = await request.post("/api/newsletter", { data: { email } });
    expect(second.status()).toBe(200);
    const body = (await second.json()) as {
      ok: boolean;
      alreadySubscribed?: boolean;
    };
    expect(body.ok).toBe(true);
    // alreadySubscribed is only present when WIX_VELO_SITE_URL is set; in CI
    // soft-ack mode the flag is absent. Both branches are valid here.
    if (body.alreadySubscribed !== undefined) {
      expect(typeof body.alreadySubscribed).toBe("boolean");
    }
  });

  test("invalid email: returns 400 invalid-email", async ({ request }) => {
    const res = await request.post("/api/newsletter", {
      data: { email: "not-an-email" },
    });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid-email" });
  });

  test("invalid json: returns 400 invalid-json", async ({ request }) => {
    const res = await request.post("/api/newsletter", {
      data: "not-json",
      headers: { "content-type": "application/json" },
    });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid-json" });
  });
});
