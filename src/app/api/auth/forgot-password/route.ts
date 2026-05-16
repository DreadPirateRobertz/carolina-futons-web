import { NextResponse, type NextRequest } from "next/server";
import { sendPasswordResetEmail } from "@/lib/wix/auth";
import { hashEmail } from "@/lib/log/hash-pii";
import { logError } from "@/lib/logging/log-error";

export const dynamic = "force-dynamic";

// Always returns the same success-shaped payload regardless of whether the
// email exists — surfacing "no such account" would let attackers enumerate
// member emails. Errors from Wix are logged server-side but not echoed back.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const redirectUrl = new URL("/account?reset=sent", req.url).toString();

  try {
    await sendPasswordResetEmail(email, redirectUrl);
  } catch (err) {
    // cfw-pyx1: the route always returns ok:true to prevent member-
    // email enumeration, so Sentry is the ONLY signal that a recovery-
    // email outage exists. cfw-coc PII guard: hashed email in extras
    // so a recurring per-address failure is groupable without
    // shipping the raw email into log storage.
    await logError("auth/forgot-password", "sendPasswordResetEmail", err, {
      hashedEmail: hashEmail(email),
    });
  }

  return NextResponse.json({ ok: true });
}
