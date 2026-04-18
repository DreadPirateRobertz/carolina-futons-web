import { NextResponse } from "next/server";
import {
  coerceContactRequest,
  hasContactErrors,
  validateContactRequest,
} from "@/lib/contact/contact-schema";

export const dynamic = "force-dynamic";

// POST /api/contact — validates inbound messages and (for now) logs them.
// A downstream transport (email, ticketing) is intentionally out of scope for
// cf-3qt.8.B; the validation contract + JSON shape lock in so a later wave can
// swap in the transport without the client form changing.
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-json" },
      { status: 400 },
    );
  }

  const req = coerceContactRequest(payload);
  const errors = validateContactRequest(req);
  if (hasContactErrors(errors)) {
    return NextResponse.json(
      { ok: false, error: "validation", errors },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
