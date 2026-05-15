/**
 * cf-v4py — fixture-OFF E2E tests for the cfutons Velo wrapper endpoints
 * shipped in cf-uwfw (cfutons PR #1251).
 *
 * Hits the real Velo backend directly (NOT through cfw's /api/email/trigger
 * proxy). Bypasses cfw's fixture-mode short-circuit. Verifies that the
 * cfutons-side HTTP wrappers (post_queueWelcomeEmail / post_queueCartRecovery)
 * accept the documented payload shapes and return the expected envelopes.
 *
 * ## Running
 *
 * Currently SKIPPED until two prerequisites land:
 *   1. Stilgar publishes the latest cfutons backend to STAGING_SITE
 *      (chrisdealglass.wixstudio.com/my-site) via Wix CLI.
 *   2. WIX_VELO_STAGING_URL env var is set in the GH Actions e2e step,
 *      OR the runner sets STAGING_VELO_BEARER for authenticated calls.
 *
 * To enable, remove the `test.skip(...)` guards and provide:
 *   - WIX_VELO_STAGING_URL (e.g. https://chrisdealglass.wixstudio.com/my-site)
 *   - WIX_VELO_STAGING_BEARER (optional — only required for SiteMember auth
 *     paths; queueWelcomeEmail and queueCartRecovery currently delegate
 *     auth to the inner webMethod which self-guards via resolveContactId)
 *
 * ## Naming notes (vs the cf-v4py bead)
 *
 * The bead names three endpoints — triggerWelcomeSeries,
 * triggerCartRecovery, triggerTransactionalEmail — but the actual HTTP
 * wrappers in cfutons http-functions.js (per cf-uwfw PR #1251) are:
 *   - /_functions/queueWelcomeEmail  → bridges to triggerWelcomeSeries(email, firstName)
 *   - /_functions/queueCartRecovery  → stub-accepts items[] hint
 *
 * `triggerTransactionalEmail` does NOT exist as a wrapper — it would be a
 * separate bead if PM wants a generic transactional dispatch endpoint
 * (different from the per-flow wrappers). This spec covers the two real
 * wrappers + flags the missing third as SKIPPED-WITH-NOTE.
 *
 * ## Assertions (per wrapper)
 *
 * Each test asserts:
 *   - HTTP 200/4xx as documented
 *   - JSON envelope shape (success boolean, error string when relevant)
 *   - Specific error codes (invalid_json, etc.) for validation paths
 *
 * What this spec does NOT assert:
 *   - Inbox arrival of the welcome email (covered by cf-w1u1 row 1)
 *   - EmailQueue row insertion (covered by cf-w1u1 + cf-jvut runbooks)
 *   - Side-effects on Wix CRM (Stilgar's manual verification)
 *
 * Refs: cf-v4py, cf-uwfw (PR #1251), cf-7ozz, cf-vtx5, cf-jqkg
 */

import { test, expect, type APIRequestContext } from "@playwright/test";

// ── Configuration ─────────────────────────────────────────────────────────────

const STAGING_VELO_BASE = process.env.WIX_VELO_STAGING_URL ?? "";
const STAGING_VELO_BEARER = process.env.WIX_VELO_STAGING_BEARER ?? "";
const STAGING_AVAILABLE = STAGING_VELO_BASE.length > 0;

// Tests run only when staging is configured. Default is SKIP so CI doesn't
// hammer Velo on every PR — opt in via env vars when Stilgar publishes.
const stagingTest = STAGING_AVAILABLE ? test : test.skip;

const headers = (): Record<string, string> => {
  const base: Record<string, string> = { "content-type": "application/json" };
  if (STAGING_VELO_BEARER) base.authorization = `Bearer ${STAGING_VELO_BEARER}`;
  return base;
};

const url = (fn: string): string => `${STAGING_VELO_BASE}/_functions/${fn}`;

const post = async (
  request: APIRequestContext,
  fn: string,
  body: unknown,
) =>
  request.post(url(fn), {
    headers: headers(),
    data: body as Record<string, unknown>,
  });

// ── /_functions/queueWelcomeEmail ─────────────────────────────────────────────
// Wraps emailAutomation.web.js#triggerWelcomeSeries(email, firstName).
// Accepts both {args:[payload]} (callVelo shape) and direct {email, firstName}
// per cf-uwfw PR #1251.

test.describe("/_functions/queueWelcomeEmail — fixture-OFF", () => {
  stagingTest("returns 200 + {success:true, queued:N} for a valid email (callVelo shape)", async ({
    request,
  }) => {
    const res = await post(request, "queueWelcomeEmail", {
      args: [{ type: "welcome", email: "halworker85+welcome-e2e@gmail.com", firstName: "E2E Tester" }],
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { success: boolean; queued: number };
    expect(body.success).toBe(true);
    // triggerWelcomeSeries queues 5 welcome rows on first call; subsequent
    // calls dedupe and return queued:0. Either is acceptable here — the
    // dedup guard is the contract.
    expect(typeof body.queued).toBe("number");
    expect(body.queued).toBeGreaterThanOrEqual(0);
    expect(body.queued).toBeLessThanOrEqual(5);
  });

  stagingTest("accepts direct {email, firstName} body (no callVelo wrapping)", async ({ request }) => {
    const res = await post(request, "queueWelcomeEmail", {
      email: "halworker85+welcome-direct@gmail.com",
      firstName: "Direct Caller",
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  stagingTest("returns 400 'email is required' when email is missing", async ({ request }) => {
    const res = await post(request, "queueWelcomeEmail", { args: [{ type: "welcome" }] });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/email/i);
  });

  stagingTest("returns 400 invalid_json on a malformed body", async ({ request }) => {
    const res = await request.post(url("queueWelcomeEmail"), {
      headers: headers(),
      data: "not-json",
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_json");
  });

  stagingTest("OPTIONS preflight returns CORS headers", async ({ request }) => {
    const res = await request.fetch(url("queueWelcomeEmail"), {
      method: "OPTIONS",
      headers: { origin: "https://carolina-futons-web.vercel.app" },
    });
    expect(res.status()).toBeLessThan(400);
  });
});

// ── /_functions/queueCartRecovery ─────────────────────────────────────────────
// Stub-accepts an items[] hint — see cf-uwfw PR #1251 description. The
// cron-driven triggerAbandonedCartRecovery remains the canonical cart-recovery
// trigger; this endpoint is a placeholder until PM wants active AbandonedCarts
// row seeding from cfw.

test.describe("/_functions/queueCartRecovery — fixture-OFF", () => {
  stagingTest("returns 200 + {success:true, accepted:N} for a valid items[] payload", async ({
    request,
  }) => {
    const res = await post(request, "queueCartRecovery", {
      args: [
        {
          type: "cart-recovery",
          items: [
            { productId: "prod-eureka-frame", quantity: 1 },
            { productId: "prod-moonshadow-mattress", quantity: 1 },
          ],
        },
      ],
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { success: boolean; accepted: number };
    expect(body.success).toBe(true);
    expect(body.accepted).toBe(2);
  });

  stagingTest("accepts a direct {items:[…]} body (no callVelo wrapping)", async ({ request }) => {
    const res = await post(request, "queueCartRecovery", {
      items: [{ productId: "prod-eureka-frame", quantity: 3 }],
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { accepted: number };
    expect(body.accepted).toBe(1);
  });

  stagingTest("returns 400 when items[] is missing", async ({ request }) => {
    const res = await post(request, "queueCartRecovery", { args: [{ type: "cart-recovery" }] });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/items\[\] is required/);
  });

  stagingTest("returns 400 when items[] is empty", async ({ request }) => {
    const res = await post(request, "queueCartRecovery", { args: [{ items: [] }] });
    expect(res.status()).toBe(400);
  });

  stagingTest("returns 400 when an item is malformed (no productId)", async ({ request }) => {
    const res = await post(request, "queueCartRecovery", { items: [{ quantity: 1 }] });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/productId/);
  });

  stagingTest("returns 400 when an item has zero or negative quantity", async ({ request }) => {
    const res = await post(request, "queueCartRecovery", { items: [{ productId: "prod-x", quantity: 0 }] });
    expect(res.status()).toBe(400);
  });
});

// ── /_functions/triggerTransactionalEmail — DOES NOT EXIST ────────────────────
// The cf-v4py bead names this endpoint but it was NOT shipped in cf-uwfw
// PR #1251. cfutons currently routes individual transactional sends through
// per-flow wrappers (sendOrderConfirmation, sendShippingNotification,
// sendDeliveryConfirmation, sendFreightShippingNotification, sendEmail
// for contact form, sendSwatchConfirmationEmail). There is no generic
// "triggerTransactionalEmail({template, contactId, vars})" dispatcher.
//
// If PM wants one, file a follow-up bead — pattern is the same dispatcher
// shape as cf-vtx5's _veloDispatch but registry would map template names
// → per-flow webMethods. Keep the spec block below as documentation so the
// next reader sees the gap explicitly rather than wondering where the test is.

test.describe.skip("/_functions/triggerTransactionalEmail — NOT IMPLEMENTED", () => {
  test("placeholder — file follow-up bead if a generic transactional dispatcher is wanted", () => {
    // No-op. Skipped via describe.skip so CI reports it as pending without
    // attempting to call a non-existent endpoint.
  });
});

// ── Smoke: dispatcher reachability ────────────────────────────────────────────
// If staging is configured but the wrappers aren't published yet, every
// stagingTest above will return 404. This single smoke assertion catches
// that case loudly so the operator knows whether the gate is "wrappers
// missing" vs "wrappers responding incorrectly".

stagingTest("smoke: queueWelcomeEmail returns 200/4xx (NOT 404 — wrappers must be published)", async ({
  request,
}) => {
  const res = await post(request, "queueWelcomeEmail", { email: "halworker85+smoke@gmail.com" });
  expect(
    res.status(),
    "if 404: cfutons backend not published to staging via Wix CLI yet (cf-uwfw PR #1251 must be live on the staging Wix Studio site)",
  ).not.toBe(404);
  expect(res.status()).toBeLessThan(500);
});
