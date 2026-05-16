import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { logError } from "@/lib/logging/log-error";

export const dynamic = "force-dynamic";

const ALLOWED_SOURCE_RIGS = new Set(["cfutons_mobile"]);

const SUPPORTED_EVENTS = new Set([
  "quiz_completed",
  "ar_discovery_completed",
  "social_share_completed",
  "badge_earned",
  "tier_changed",
] as const);

type CrossRigEventType =
  | "quiz_completed"
  | "ar_discovery_completed"
  | "social_share_completed"
  | "badge_earned"
  | "tier_changed";

type CrossRigBody = {
  memberId: string;
  event: CrossRigEventType;
  payload: Record<string, unknown>;
  sourceRig: string;
};

function bad(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}

function verifySecret(header: string | null, secret: string): boolean {
  // timingSafeEqual requires equal-length buffers; length mismatch → false
  // (not an error — guards against early-exit timing attacks on the length).
  const a = Buffer.from(header ?? "", "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CROSS_RIG_SECRET;
  if (!secret) {
    // Fail closed — missing env var is a server misconfiguration, not a
    // client error. Matches the revalidate route's fail-closed pattern.
    // TODO cf-0qk9 follow-up: add HMAC + ts replay window once mobile
    // client can sign requests (same risk class as Stage 3 credit issuance).
    // cfw-to8z: synthesize an Error for Sentry fingerprinting (cfw-1r9n
    // pattern). Cross-rig is security-sensitive — a deploy where this
    // env never got populated would silently 500 every mobile-side
    // gamification event; Sentry alerting catches that immediately.
    await logError(
      "api/cross-rig",
      "config",
      new Error("CROSS_RIG_SECRET env var not set"),
    );
    return bad(500, "server misconfiguration");
  }
  if (!verifySecret(req.headers.get("x-cross-rig-secret"), secret)) {
    return bad(401, "unauthorized");
  }

  let body: CrossRigBody;
  try {
    body = (await req.json()) as CrossRigBody;
  } catch {
    return bad(400, "invalid JSON body");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return bad(400, "body must be a JSON object");
  }

  const { memberId, event, sourceRig } = body;
  const payload = body.payload;

  if (!memberId || typeof memberId !== "string") {
    return bad(400, "memberId is required");
  }
  if (!ALLOWED_SOURCE_RIGS.has(sourceRig)) {
    return bad(400, `unknown sourceRig: ${sourceRig ?? "(missing)"}`);
  }
  if (!event || !SUPPORTED_EVENTS.has(event)) {
    return bad(400, `unsupported event: ${event ?? "(missing)"}`);
  }
  if (
    payload != null &&
    (typeof payload !== "object" || Array.isArray(payload))
  ) {
    return bad(400, "payload must be an object");
  }

  const p: Record<string, unknown> = payload ?? {};

  if (event === "quiz_completed") {
    if (!p.quizId || typeof p.quizId !== "string")
      return bad(400, "quiz_completed requires quizId (string)");
    if (!p.resultSlug || typeof p.resultSlug !== "string")
      return bad(400, "quiz_completed requires resultSlug (string)");
  }
  if (event === "tier_changed") {
    if (!p.newTier || typeof p.newTier !== "string")
      return bad(400, "tier_changed requires newTier (string)");
  }

  // cfw-coc: log payload SHAPE (which keys were present) but not VALUES —
  // payload contents are arbitrary user-data from the mobile rig and may
  // include PII. Shape is enough to debug missing/unexpected fields; values
  // are intentionally omitted from server stdout retention.
  const payloadKeys = Object.keys(p).sort().join(",");
  console.log(
    `[cross-rig] event=${event} sourceRig=${sourceRig} payloadKeys=${payloadKeys || "(none)"}`,
  );

  return NextResponse.json({ ok: true, event, memberId });
}
