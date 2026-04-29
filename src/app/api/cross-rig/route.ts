import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_SOURCE_RIGS = new Set(["cfutons_mobile"]);

const SUPPORTED_EVENTS = new Set([
  "quiz_completed",
  "ar_discovery_completed",
  "social_share_completed",
  "badge_earned",
  "tier_changed",
]);

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

function err(status: number, error: string): NextResponse {
  return NextResponse.json({ success: false, error }, { status });
}

function verifySecret(header: string | null, secret: string): boolean {
  try {
    const a = Buffer.from(header ?? "", "utf8");
    const b = Buffer.from(secret, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CROSS_RIG_SECRET;
  if (secret) {
    if (!verifySecret(req.headers.get("x-cross-rig-secret"), secret)) {
      return err(401, "unauthorized");
    }
  }

  let body: CrossRigBody;
  try {
    body = (await req.json()) as CrossRigBody;
  } catch {
    return err(400, "invalid JSON body");
  }

  const { memberId, event, payload, sourceRig } = body;

  if (!memberId || typeof memberId !== "string") {
    return err(400, "memberId is required");
  }
  if (!ALLOWED_SOURCE_RIGS.has(sourceRig)) {
    return err(400, `unknown sourceRig: ${sourceRig ?? "(missing)"}`);
  }
  if (!event || !SUPPORTED_EVENTS.has(event)) {
    return err(400, `unsupported event: ${event ?? "(missing)"}`);
  }

  const p = payload ?? {};

  if (event === "quiz_completed") {
    if (!p.quizId) return err(400, "quiz_completed requires quizId");
    if (!p.resultSlug) return err(400, "quiz_completed requires resultSlug");
  }
  if (event === "tier_changed") {
    if (!p.newTier) return err(400, "tier_changed requires newTier");
  }

  console.log("[cross-rig]", JSON.stringify({ event, memberId, sourceRig, payload: p }));

  return NextResponse.json({ success: true, event, memberId });
}
