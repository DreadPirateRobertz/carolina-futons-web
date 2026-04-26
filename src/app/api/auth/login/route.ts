import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { LoginState } from "@wix/sdk";
import { getWixClientWithTokens } from "@/lib/wix-client";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  serializeSessionTokens,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Maps Wix SDK error codes to user-facing messages. Kept generic to avoid
// leaking whether an email exists — "invalidEmail" and "invalidPassword"
// both surface as the same message to the user.
const ERROR_MESSAGES: Record<string, string> = {
  invalidEmail: "Email or password is incorrect.",
  invalidPassword: "Email or password is incorrect.",
  resetPassword: "Please reset your password via the link we sent to your email.",
};

function safeCallbackUrl(raw: string | null | undefined): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    callbackUrl?: string;
  };

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const callbackUrl = safeCallbackUrl(body.callbackUrl);

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const client = getWixClientWithTokens();

  let state;
  try {
    state = await client.auth.login({ email, password });
  } catch {
    return NextResponse.json(
      { error: "Sign-in failed. Please try again." },
      { status: 502 },
    );
  }

  if (state.loginState === LoginState.SUCCESS) {
    let tokens;
    try {
      tokens = await client.auth.getMemberTokensForDirectLogin(
        (state as { data: { sessionToken: string } }).data.sessionToken,
      );
    } catch {
      return NextResponse.json(
        { error: "Sign-in failed. Please try again." },
        { status: 502 },
      );
    }
    const jar = await cookies();
    jar.set(SESSION_COOKIE_NAME, serializeSessionTokens(tokens), {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 4 * 60 * 60,
    });
    return NextResponse.json({ ok: true, redirectTo: callbackUrl });
  }

  if (state.loginState === LoginState.EMAIL_VERIFICATION_REQUIRED) {
    return NextResponse.json(
      { state: "email_verification_required" },
      { status: 200 },
    );
  }

  if (state.loginState === LoginState.OWNER_APPROVAL_REQUIRED) {
    return NextResponse.json(
      {
        error:
          "Your account is awaiting approval. We'll email you when it's ready.",
      },
      { status: 403 },
    );
  }

  if (state.loginState === LoginState.FAILURE) {
    const code = (state as { errorCode?: string }).errorCode ?? "";
    const message =
      ERROR_MESSAGES[code] ?? "Sign-in failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  // SILENT_CAPTCHA_REQUIRED / USER_CAPTCHA_REQUIRED / other unexpected states
  return NextResponse.json(
    { error: "Sign-in failed. Please try again." },
    { status: 400 },
  );
}
