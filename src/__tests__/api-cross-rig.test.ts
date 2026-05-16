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

beforeEach(() => {
  vi.stubEnv("CROSS_RIG_SECRET", TEST_SECRET);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
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

// Pins the logError migration so an accidental revert to a bare
// console.error("[cross-rig] …") (or to a non-bracketed prefix that
// bypasses the helper) fails loudly. Asserts on the console.error sink
// because logError forwards there in every env; the Sentry forwarder
// is prod-only and unit-tested in log.test.ts.
describe("POST /api/cross-rig — logError migration", () => {
  it("emits the bracketed '[cross-rig] CROSS_RIG_SECRET env var not set' prefix exactly once when the env var is missing", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("CROSS_RIG_SECRET", "");
    const errSpy = console.error as unknown as ReturnType<typeof vi.fn>;
    errSpy.mockClear();
    const POST = await route();
    await POST(
      makeRequest({ ...BASE_BODY, event: "badge_earned" }, { secret: null }),
    );
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(errSpy.mock.calls[0]![0]).toBe(
      "[cross-rig] CROSS_RIG_SECRET env var not set",
    );
    // logError with no err is called with a single arg — no trailing
    // undefined slot. Guards against an accidental
    //   logError("cross-rig", "...", undefined)
    // that would emit a noisy second console.error arg.
    expect(errSpy.mock.calls[0]!.length).toBe(1);
  });

  it("does NOT log when the env var IS set but the secret header is missing (401 is a client error, not a server log)", async () => {
    const errSpy = console.error as unknown as ReturnType<typeof vi.fn>;
    errSpy.mockClear();
    const POST = await route();
    const res = await POST(
      makeRequest({ ...BASE_BODY, event: "badge_earned" }, { secret: null }),
    );
    expect(res.status).toBe(401);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it("does NOT log on a successful happy-path request (no console.error noise on 200)", async () => {
    const errSpy = console.error as unknown as ReturnType<typeof vi.fn>;
    errSpy.mockClear();
    const POST = await route();
    const res = await POST(
      makeRequest({
        ...BASE_BODY,
        event: "badge_earned",
        payload: { badgeId: "b1" },
      }),
    );
    expect(res.status).toBe(200);
    expect(errSpy).not.toHaveBeenCalled();
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
