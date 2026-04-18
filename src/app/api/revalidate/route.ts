import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createHmac, timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";

// Webhooks with a `ts` field older than this are rejected as replays.
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
  const secret = process.env.WIX_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "WIX_WEBHOOK_SECRET is not configured" },
      { status: 500 },
    );
  }

  const rawBody = await req.text();
  const signature =
    req.headers.get("x-wix-signature") ??
    req.headers.get("x-hub-signature-256");
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json(
      { ok: false, error: "invalid signature" },
      { status: 401 },
    );
  }

  let body: WixWebhookBody;
  try {
    body = rawBody.length > 0 ? (JSON.parse(rawBody) as WixWebhookBody) : {};
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid json" },
      { status: 400 },
    );
  }

  // Replay protection: reject if ts is present and outside the allowed window.
  // Webhooks without ts (legacy callers before F2) are still accepted.
  if (typeof body.ts === "number") {
    const age = Math.abs(Date.now() - body.ts);
    if (age > REPLAY_WINDOW_MS) {
      return NextResponse.json(
        { ok: false, error: "timestamp out of window" },
        { status: 401 },
      );
    }
  }

  const tags = new Set<string>();
  if (body.collectionId) tags.add(`wix:collection:${body.collectionId}`);
  if (body.itemId) tags.add(`wix:item:${body.itemId}`);
  for (const t of body.tags ?? []) tags.add(t);

  for (const t of tags) revalidateTag(t, "default");

  return NextResponse.json({
    ok: true,
    revalidated: [...tags],
    eventType: body.eventType ?? null,
  });
}
