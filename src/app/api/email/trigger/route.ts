import { NextResponse, type NextRequest } from "next/server";
import { callVelo, VeloRpcError } from "@/lib/wix/velo-client";
import { logError } from "@/lib/log";

export const dynamic = "force-dynamic";

export type EmailTriggerPayload =
  | { type: "welcome"; email: string }
  | { type: "cart-recovery"; items: { productId: string; quantity: number }[] };

// In fixture mode there is no Velo backend to call. Skip gracefully so
// CI and local fixture previews don't see Velo connection errors.
const isFixtureMode =
  process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const type = b['type'];
  if (type !== 'welcome' && type !== 'cart-recovery') {
    return NextResponse.json({ error: "type must be 'welcome' or 'cart-recovery'" }, { status: 400 });
  }
  if (type === 'welcome' && typeof b['email'] !== 'string') {
    return NextResponse.json({ error: 'email is required for welcome triggers' }, { status: 400 });
  }
  if (type === 'cart-recovery' && (!Array.isArray(b['items']) || (b['items'] as unknown[]).length === 0)) {
    return NextResponse.json({ error: 'items[] is required for cart-recovery triggers' }, { status: 400 });
  }
  const payload = body as EmailTriggerPayload;

  if (isFixtureMode) {
    return NextResponse.json({ ok: true, skipped: "fixture-mode" });
  }

  const veloMethod =
    payload.type === "welcome" ? "queueWelcomeEmail" : "queueCartRecovery";

  try {
    await callVelo({ method: veloMethod, args: [payload] });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // op split mirrors style-quiz (cfw-logger batch 11): Velo HTTP-level
    // failures get .rpc so Sentry can split them from generic throws.
    const op = err instanceof VeloRpcError ? `${veloMethod}.rpc` : veloMethod;
    await logError("email/trigger", op, err);
    // Non-fatal — email triggers must not block the primary user flow.
    return NextResponse.json({ ok: false, error: "trigger-failed" }, { status: 200 });
  }
}
