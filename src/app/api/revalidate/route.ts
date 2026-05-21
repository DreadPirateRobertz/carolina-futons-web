import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";

import { SITE_CONTENT_CACHE_TAG } from "@/lib/cms/site-content";
import { logError, logWarn } from "@/lib/observability/log";

export const dynamic = "force-dynamic";

// Guard against DoS via oversized bodies. Wix webhook payloads are tiny JSON
// objects; 64 KiB is orders of magnitude above any legitimate payload.
const MAX_BODY_BYTES = 64 * 1024;

// cfw-r5x: collection → reader-cache-tag mapping. Wix CMS webhooks identify
// the source collection via collectionId, but our readers cache under their
// own short tags (e.g. "site-content") so callers can revalidate without
// knowing the underlying collection name. Without this mapping, a Brenda
// edit to SiteContent would invalidate `wix:collection:SiteContent` but
// leave the SiteContent reader's cache untouched until the 5-minute
// unstable_cache window expired.
const COLLECTION_TAG_MAP: Record<string, readonly string[]> = {
  SiteContent: [SITE_CONTENT_CACHE_TAG],
};

// REPLAY_WINDOW_MS intentionally matches the unstable_cache revalidate window
// in site-content.ts (300s). A webhook older than one TTL cycle cannot prevent
// a stale read anyway, so replaying it would be harmless but wasteful.
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
  const received = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader;
  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(received, "hex");
  // timingSafeEqual requires equal-length non-empty buffers. Unequal length
  // means wrong bytes (or Buffer.from truncated an odd-length hex string) —
  // reject. Zero-length means an empty signature string slipped through.
  if (expectedBuf.length !== receivedBuf.length || expectedBuf.length === 0)
    return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

export async function POST(req: NextRequest) {
  const correlationId =
    req.headers.get("x-correlation-id") ?? randomUUID();

  const secret = process.env.WIX_WEBHOOK_SECRET;
  if (!secret) {
    logError(
      "revalidate",
      "misconfigured — WIX_WEBHOOK_SECRET missing",
      { correlationId },
    );
    return NextResponse.json(
      {
        ok: false,
        error: "server configuration error",
        errorId: correlationId,
      },
      { status: 500 },
    );
  }

  // Reject before buffering if Content-Length already tells us it's too big.
  const declaredLength = req.headers.get("content-length");
  if (declaredLength !== null && parseInt(declaredLength, 10) > MAX_BODY_BYTES) {
    logWarn("revalidate", "payload too large", undefined, { correlationId });
    return NextResponse.json(
      { ok: false, error: "payload too large", errorId: correlationId },
      { status: 413 },
    );
  }

  const rawBody = await req.text();
  const signature =
    req.headers.get("x-wix-signature") ??
    req.headers.get("x-hub-signature-256");
  if (!verifySignature(rawBody, signature, secret)) {
    logWarn("revalidate", "signature rejected", undefined, { correlationId });
    return NextResponse.json(
      { ok: false, error: "invalid signature", errorId: correlationId },
      { status: 401 },
    );
  }

  let body: WixWebhookBody;
  try {
    // Empty body is a valid no-op (Wix uses it as a registration handshake).
    body = rawBody.length > 0 ? (JSON.parse(rawBody) as WixWebhookBody) : {};
  } catch {
    logWarn("revalidate", "invalid JSON body", undefined, { correlationId });
    return NextResponse.json(
      { ok: false, error: "invalid json", errorId: correlationId },
      { status: 400 },
    );
  }

  // Replay protection: reject if ts is present and outside the allowed window.
  // Webhooks without ts are still accepted for backward compatibility with
  // older Wix webhook schemas that omit the field (tracked: cfw-ujp).
  if (body.ts !== undefined) {
    if (!Number.isFinite(body.ts)) {
      logWarn("revalidate", "non-finite ts rejected", undefined, { correlationId });
      return NextResponse.json(
        { ok: false, error: "invalid timestamp", errorId: correlationId },
        { status: 400 },
      );
    }
    const age = Math.abs(Date.now() - body.ts);
    if (age > REPLAY_WINDOW_MS) {
      logWarn("revalidate", "timestamp outside window", undefined, { correlationId, ageMs: age });
      return NextResponse.json(
        { ok: false, error: "timestamp out of window", errorId: correlationId },
        { status: 401 },
      );
    }
  }

  const tags = new Set<string>();
  if (body.collectionId) {
    tags.add(`wix:collection:${body.collectionId}`);
    for (const mapped of COLLECTION_TAG_MAP[body.collectionId] ?? []) {
      tags.add(mapped);
    }
  }
  if (body.itemId) tags.add(`wix:item:${body.itemId}`);
  for (const t of body.tags ?? []) tags.add(t);

  const failedTags: string[] = [];
  for (const t of tags) {
    try {
      revalidateTag(t, "default");
    } catch (err) {
      failedTags.push(t);
      logError("revalidate", `revalidateTag failed for "${t}"`, { correlationId, err });
    }
  }
  if (failedTags.length > 0) {
    return NextResponse.json(
      { ok: false, error: "cache invalidation failed", failed: failedTags, errorId: correlationId },
      { status: 500 },
    );
  }

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
