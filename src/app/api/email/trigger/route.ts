import { NextResponse, type NextRequest } from "next/server";
import { callVelo, VeloRpcError } from "@/lib/wix/velo-client";

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

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).type !== "string" ||
    typeof (body as Record<string, unknown>).email !== "string"
  ) {
    return NextResponse.json(
      { error: "type and email are required" },
      { status: 400 },
    );
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
    if (err instanceof VeloRpcError) {
      console.error(`[email/trigger] Velo ${veloMethod} failed:`, err.status, err.body);
    } else {
      console.error(`[email/trigger] unexpected error:`, err);
    }
    // Non-fatal — email triggers must not block the primary user flow.
    return NextResponse.json({ ok: false, error: "trigger-failed" }, { status: 200 });
  }
}
