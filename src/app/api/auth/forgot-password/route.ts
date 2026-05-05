import { NextResponse, type NextRequest } from "next/server";
import { sendPasswordResetEmail } from "@/lib/wix/auth";

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
    console.error("[auth/forgot-password] sendRecoveryEmail failed:", err);
  }

  return NextResponse.json({ ok: true });
}
