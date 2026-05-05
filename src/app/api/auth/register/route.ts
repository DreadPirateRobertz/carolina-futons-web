import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { LoginState, type Tokens } from "@wix/sdk";
import { getWixClientWithTokens } from "@/lib/wix-client";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  serializeSessionTokens,
  safeCallbackUrl,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type WixClient = ReturnType<typeof getWixClientWithTokens>;

// After a successful register, Wix returns a one-time `sessionToken` that we
// exchange for member tokens. That exchange occasionally fails for transient
// reasons even when the member row is fully created. Falling back to a regular
// `login(email, password)` recovers the session in those cases instead of
// stranding the user on a "Account created — please sign in" screen where the
// subsequent sign-in also silently fails (cfw-aik).
async function exchangeOrLoginFallback(
  client: WixClient,
  sessionToken: string,
  email: string,
  password: string,
): Promise<
  | { tokens: Tokens }
  | { state: "email_verification_required" }
  | { error: string; status: number }
> {
  try {
    const tokens = await client.auth.getMemberTokensForDirectLogin(sessionToken);
    return { tokens };
  } catch (err) {
    console.error(
      "[auth/register] getMemberTokensForDirectLogin failed; falling back to login()",
      err,
    );
  }

  let loginState;
  try {
    loginState = await client.auth.login({ email, password });
  } catch (err) {
    console.error("[auth/register] login fallback threw:", err);
    return {
      error: "Sign-up succeeded, but signing you in failed. Please check your email for a verification link, then sign in.",
      status: 502,
    };
  }

  if (loginState.loginState === LoginState.SUCCESS) {
    try {
      const tokens = await client.auth.getMemberTokensForDirectLogin(
        (loginState as { data: { sessionToken: string } }).data.sessionToken,
      );
      return { tokens };
    } catch (err) {
      console.error(
        "[auth/register] login fallback token exchange failed:",
        err,
      );
      return { state: "email_verification_required" };
    }
  }

  if (loginState.loginState === LoginState.EMAIL_VERIFICATION_REQUIRED) {
    return { state: "email_verification_required" };
  }

  // Wix returns LoginState.FAILURE with a generic `invalidPassword` errorCode
  // for unverified accounts (to prevent enumeration). The most actionable
  // message we can surface is "check your email" — better than the legacy
  // "Account created. Sign in to continue." which led the user into another
  // dead end. cfw-aik repro path lands here.
  console.error(
    "[auth/register] login fallback returned non-success state:",
    loginState.loginState,
  );
  return { state: "email_verification_required" };
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
    state = await client.auth.register({ email, password });
  } catch (err) {
    console.error("[auth/register] client.auth.register failed:", err);
    return NextResponse.json(
      { error: "Sign-up failed. Please try again." },
      { status: 502 },
    );
  }

  if (state.loginState === LoginState.SUCCESS) {
    const result = await exchangeOrLoginFallback(
      client,
      (state as { data: { sessionToken: string } }).data.sessionToken,
      email,
      password,
    );

    if ("tokens" in result) {
      const jar = await cookies();
      jar.set(SESSION_COOKIE_NAME, serializeSessionTokens(result.tokens), {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: 4 * 60 * 60,
      });
      return NextResponse.json({ ok: true, redirectTo: callbackUrl });
    }

    if ("state" in result) {
      return NextResponse.json({ state: result.state }, { status: 200 });
    }

    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
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
