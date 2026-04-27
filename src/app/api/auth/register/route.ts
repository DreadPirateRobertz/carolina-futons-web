import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { LoginState } from "@wix/sdk";
import { getWixClientWithTokens } from "@/lib/wix-client";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  serializeSessionTokens,
  safeCallbackUrl,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

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
    state = await client.auth.register({ email, password });
  } catch {
    return NextResponse.json(
      { error: "Sign-up failed. Please try again." },
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
      // Registration succeeded but session exchange failed. Ask the user to
      // sign in — the wixMembers_onMemberCreated hook has already fired.
      return NextResponse.json(
        { state: "registered_sign_in_required" },
        { status: 200 },
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
    if (code === "emailAlreadyExists") {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 },
      );
    }
    if (code === "invalidEmail") {
      return NextResponse.json(
        { error: "That email address is invalid." },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: "Sign-up failed. Please try again." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { error: "Sign-up failed. Please try again." },
    { status: 400 },
  );
}
