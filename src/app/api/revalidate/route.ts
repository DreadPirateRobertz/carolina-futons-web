import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

// Webhooks with a `ts` field more than this many ms from the current time
// (past or future) are rejected to prevent replay and pre-signed-payload attacks.
const REPLAY_WINDOW_MS = 5 * 60 * 1000;

interface WixWebhookBody {
  collectionId?: string;
  itemId?: string;
  eventType?: string;
  tags?: string[];
  ts?: number;
}

function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const got = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader;
  const expectedBuf = Buffer.from(expected, "hex");
  const gotBuf = Buffer.from(got, "hex");
  if (expectedBuf.length !== gotBuf.length || expectedBuf.length === 0)
    return false;
  return timingSafeEqual(expectedBuf, gotBuf);
}

export async function POST(req: NextRequest) {
  const correlationId =
    req.headers.get("x-correlation-id") ?? randomUUID();

  const secret = process.env.WIX_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[revalidate] misconfigured — WIX_WEBHOOK_SECRET missing", {
      correlationId,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "WIX_WEBHOOK_SECRET is not configured",
        errorId: correlationId,
      },
      { status: 500 },
    );
  }

  const rawBody = await req.text();
  const signature =
    req.headers.get("x-wix-signature") ??
    req.headers.get("x-hub-signature-256");
  if (!verifySignature(rawBody, signature, secret)) {
    console.warn("[revalidate] signature rejected", { correlationId });
    return NextResponse.json(
      { ok: false, error: "invalid signature", errorId: correlationId },
      { status: 401 },
    );
  }

  let body: WixWebhookBody;
  try {
    body = rawBody.length > 0 ? (JSON.parse(rawBody) as WixWebhookBody) : {};
  } catch {
    console.warn("[revalidate] invalid JSON body", { correlationId });
    return NextResponse.json(
      { ok: false, error: "invalid json", errorId: correlationId },
      { status: 400 },
    );
  }

  // Replay protection: reject if ts is present and outside the allowed window.
  // Webhooks without ts are still accepted for backward compatibility.
  if (body.ts !== undefined) {
    if (!Number.isFinite(body.ts)) {
      console.warn("[revalidate] non-finite ts rejected", { correlationId });
      return NextResponse.json(
        { ok: false, error: "invalid timestamp", errorId: correlationId },
        { status: 400 },
      );
    }
    const age = Math.abs(Date.now() - body.ts);
    if (age > REPLAY_WINDOW_MS) {
      console.warn("[revalidate] timestamp outside window", {
        correlationId,
        ageMs: age,
      });
      return NextResponse.json(
        { ok: false, error: "timestamp out of window", errorId: correlationId },
        { status: 401 },
      );
    }
  }

  const tags = new Set<string>();
  if (body.collectionId) tags.add(`wix:collection:${body.collectionId}`);
  if (body.itemId) tags.add(`wix:item:${body.itemId}`);
  for (const t of body.tags ?? []) tags.add(t);

  for (const t of tags) revalidateTag(t, "default");

  console.info("[revalidate] processed", {
    correlationId,
    tags: [...tags],
    eventType: body.eventType ?? null,
  });

  return NextResponse.json({
    ok: true,
    revalidated: [...tags],
    eventType: body.eventType ?? null,
    correlationId,
  });
}
