import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createHmac, timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";

interface WixWebhookBody {
  collectionId?: string;
  itemId?: string;
  eventType?: string;
  tags?: string[];
}

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const got = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader;
  const expectedBuf = Buffer.from(expected, "hex");
  const gotBuf = Buffer.from(got, "hex");
  if (expectedBuf.length !== gotBuf.length || expectedBuf.length === 0) return false;
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
  const signature = req.headers.get("x-wix-signature") ?? req.headers.get("x-hub-signature-256");
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  let body: WixWebhookBody;
  try {
    body = rawBody.length > 0 ? (JSON.parse(rawBody) as WixWebhookBody) : {};
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
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
