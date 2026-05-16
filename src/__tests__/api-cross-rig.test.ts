import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_SECRET = "test-cross-rig-secret";

function makeRequest(
  body: unknown,
  opts: { secret?: string | null; method?: string } = {},
): NextRequest {
  const { secret = TEST_SECRET, method = "POST" } = opts;
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (secret !== null) headers["x-cross-rig-secret"] = secret;
  return new NextRequest("http://localhost/api/cross-rig", {
    method,
    headers,
    body: JSON.stringify(body),
  });
}

// Partial body — always spread with event and any event-specific fields before
// passing to makeRequest. Named BASE_BODY (not VALID_BASE) because it is
// missing the required `event` field and is not standalone-valid.
const BASE_BODY = {
  memberId: "member-abc123",
  sourceRig: "cfutons_mobile",
  payload: {},
};

// cfw-mpik: env-missing catch now routes through logError → Sentry.
// Mock @sentry/nextjs so the runner doesn't ship events AND the new
// logError-integration test below can assert (scope, op) tags.
const sentryCaptureException = vi.fn();
const sentryFlush = vi.fn().mockResolvedValue(true);
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
  flush: (timeoutMs?: number) => sentryFlush(timeoutMs),
}));

beforeEach(() => {
  vi.stubEnv("CROSS_RIG_SECRET", TEST_SECRET);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  sentryCaptureException.mockReset();
  sentryFlush.mockReset().mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// Lazy import so env stubs applied in beforeEach take effect before module load.
// The route reads CROSS_RIG_SECRET inside the handler (not at module init), so
// a top-level import would also work — but lazy import is the safer pattern if
// that ever changes.
async function route() {
  const mod = await import("@/app/api/cross-rig/route");
  return mod.POST;
}

describe("POST /api/cross-rig — auth", () => {
  it("returns 401 when secret header is missing", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...BASE_BODY, event: "badge_earned" }, { secret: null }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when secret header is wrong", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...BASE_BODY, event: "badge_earned" }, { secret: "wrong" }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when secret header is empty string", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...BASE_BODY, event: "badge_earned" }, { secret: "" }),
    );
    expect(res.status).toBe(401);
  });

  it("accepts request with correct secret", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({
        ...BASE_BODY,
        event: "badge_earned",
        payload: { badgeId: "b1" },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("returns 500 when CROSS_RIG_SECRET env is not set (fail closed)", async () => {
    vi.unstubAllEnvs(); // clear the stub so the var is absent
    vi.stubEnv("CROSS_RIG_SECRET", "");
    const POST = await route();
    const res = await POST(
      makeRequest({ ...BASE_BODY, event: "badge_earned" }, { secret: null }),
    );
    // Empty string is falsy — server treats missing and empty-string the same.
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});

describe("POST /api/cross-rig — schema validation", () => {
  it("returns 400 when memberId is missing", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({
        event: "badge_earned",
        sourceRig: "cfutons_mobile",
        payload: {},
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/memberId/i);
  });

  it("returns 400 when memberId is empty string", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...BASE_BODY, memberId: "", event: "badge_earned" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/memberId/i);
  });

  it("returns 400 when sourceRig is missing", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ memberId: "m1", event: "badge_earned", payload: {} }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/sourceRig/i);
  });

  it("returns 400 when sourceRig is unknown", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({
        ...BASE_BODY,
        event: "badge_earned",
        sourceRig: "unknown_rig",
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/sourceRig/i);
  });

  it("returns 400 when event is missing", async () => {
    const POST = await route();
    const res = await POST(makeRequest({ ...BASE_BODY }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/event/i);
  });

  it("returns 400 when event is unsupported (e.g. streak_extended)", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...BASE_BODY, event: "streak_extended" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/unsupported event/i);
  });

  it("returns 400 for invalid JSON body", async () => {
    const POST = await route();
    const req = new NextRequest("http://localhost/api/cross-rig", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cross-rig-secret": TEST_SECRET,
      },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is a JSON primitive (not object)", async () => {
    const POST = await route();
    const req = new NextRequest("http://localhost/api/cross-rig", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cross-rig-secret": TEST_SECRET,
      },
      body: "42",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when payload is an array (not object)", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...BASE_BODY, event: "badge_earned", payload: [] }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/payload/i);
  });

  it("returns 200 when payload field is absent (defaults to {})", async () => {
    const POST = await route();
    const { payload: _omit, ...bodyWithoutPayload } = BASE_BODY;
    void _omit;
    const res = await POST(
      makeRequest({ ...bodyWithoutPayload, event: "ar_discovery_completed" }),
    );
    expect(res.status).toBe(200);
  });
});

describe("POST /api/cross-rig — quiz_completed", () => {
  it("returns 200 for valid quiz_completed", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({
        ...BASE_BODY,
        event: "quiz_completed",
        payload: {
          quizId: "q1",
          resultSlug: "cozy-futon",
          score: 8,
          total: 10,
        },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("returns 400 when quiz_completed payload lacks quizId", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({
        ...BASE_BODY,
        event: "quiz_completed",
        payload: { resultSlug: "cozy-futon" },
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/quizId/i);
  });

  it("returns 400 when quiz_completed quizId is not a string", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({
        ...BASE_BODY,
        event: "quiz_completed",
        payload: { quizId: 123, resultSlug: "cozy-futon" },
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/quizId/i);
  });

  it("returns 400 when quiz_completed payload lacks resultSlug", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({
        ...BASE_BODY,
        event: "quiz_completed",
        payload: { quizId: "q1" },
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/resultSlug/i);
  });
});

describe("POST /api/cross-rig — ar_discovery_completed", () => {
  it("returns 200 for valid ar_discovery_completed", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({
        ...BASE_BODY,
        event: "ar_discovery_completed",
        payload: { productId: "prod-1", score: 75, platform: "ios" },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("returns 200 for ar_discovery_completed with empty payload", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({
        ...BASE_BODY,
        event: "ar_discovery_completed",
        payload: {},
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe("POST /api/cross-rig — social_share_completed", () => {
  it("returns 200 for valid social_share_completed", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({
        ...BASE_BODY,
        event: "social_share_completed",
        payload: { productId: "prod-1", platform: "instagram" },
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe("POST /api/cross-rig — badge_earned", () => {
  it("returns 200 for badge_earned with badgeId", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({
        ...BASE_BODY,
        event: "badge_earned",
        payload: { badgeId: "badge-pioneer" },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("returns 200 for badge_earned with no badgeId (badgeId is optional)", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...BASE_BODY, event: "badge_earned", payload: {} }),
    );
    expect(res.status).toBe(200);
  });

  it("logs badge_earned event shape (event + sourceRig + payload keys, no values — cfw-coc)", async () => {
    const POST = await route();
    await POST(
      makeRequest({
        ...BASE_BODY,
        event: "badge_earned",
        payload: { badgeId: "badge-pioneer" },
      }),
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(
        /^\[cross-rig\] event=badge_earned sourceRig=cfutons_mobile payloadKeys=badgeId$/,
      ),
    );
    // Payload values must NOT appear in logs (PII redaction).
    const logCalls = (
      console.log as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls;
    const logged = logCalls
      .flat()
      .filter((arg): arg is string => typeof arg === "string")
      .join(" ");
    expect(logged).not.toContain("badge-pioneer");
  });
});

describe("POST /api/cross-rig — tier_changed", () => {
  it("returns 200 for valid tier_changed", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({
        ...BASE_BODY,
        event: "tier_changed",
        payload: { newTier: "gold" },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("returns 400 when tier_changed payload lacks newTier", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...BASE_BODY, event: "tier_changed", payload: {} }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/newTier/i);
  });

  it("returns 400 when tier_changed newTier is not a string", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({
        ...BASE_BODY,
        event: "tier_changed",
        payload: { newTier: 3 },
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/newTier/i);
  });
});

describe("POST /api/cross-rig — response shape", () => {
  it("successful response has ok:true, event, memberId", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({
        ...BASE_BODY,
        event: "badge_earned",
        payload: { badgeId: "b1" },
      }),
    );
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.event).toBe("badge_earned");
    expect(body.memberId).toBe("member-abc123");
  });

  it("error response always has ok:false and error string", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...BASE_BODY, event: "unknown_event" }),
    );
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(typeof body.error).toBe("string");
  });
});

// cfw-mpik: pin logError integration on the env-missing fail-closed.
// Missing CROSS_RIG_SECRET is a server-misconfiguration outage — the
// mobile rig's reward-issuance flow stops working entirely. Sentry
// must page before the next dropped event.
describe("POST /api/cross-rig — logError integration on env-missing fail-closed", () => {
  it("captures scope='cross-rig' + op='CROSS_RIG_SECRET env var not set' + flush(2000) and returns 500", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("CROSS_RIG_SECRET", "");

    const POST = await route();
    const res = await POST(
      makeRequest({ ...BASE_BODY, event: "badge_earned" }, { secret: null }),
    );

    expect(res.status).toBe(500);
    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryCaptureException.mock.calls[0]!;
    // No native err thrown → helper synthesizes one.
    expect(reportedErr).toBeInstanceOf(Error);
    expect((reportedErr as Error).message).toContain(
      "CROSS_RIG_SECRET env var not set",
    );
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "cross-rig",
      op: "CROSS_RIG_SECRET env var not set",
    });
    expect((opts as { level: string }).level).toBe("error");
    expect((opts as { extra: Record<string, unknown> }).extra).toEqual({
      route: "/api/cross-rig",
    });
    expect(sentryFlush).toHaveBeenCalledWith(2000);
  });

  it("happy path (secret present, valid event) does NOT call Sentry", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({
        ...BASE_BODY,
        event: "badge_earned",
        payload: { badgeId: "b1" },
      }),
    );

    expect(res.status).toBe(200);
    expect(sentryCaptureException).not.toHaveBeenCalled();
    expect(sentryFlush).not.toHaveBeenCalled();
  });

  it("unauthorized (wrong secret) does NOT call Sentry — that's an attack signal, not an outage", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest(
        { ...BASE_BODY, event: "badge_earned", payload: { badgeId: "b1" } },
        { secret: "wrong-secret" },
      ),
    );

    expect(res.status).toBe(401);
    // 401 floods Sentry would be a denial-of-budget problem; let WAF
    // / rate-limit handle attacker pressure instead.
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });
});
