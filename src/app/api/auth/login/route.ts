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
import { logWixFailure } from "@/lib/wix/errors";
import { buildAuthDiag, diagAuthorized } from "@/lib/auth/diag";
import {
  AUTH_INPUT_ERROR_MESSAGES,
  classifyAuthInputError,
} from "@/lib/auth/sdk-error";

export const dynamic = "force-dynamic";

// Maps Wix SDK error codes to user-facing messages. Kept generic to avoid
// leaking whether an email exists — "invalidEmail" and "invalidPassword"
// both surface as the same message to the user.
const ERROR_MESSAGES: Record<string, string> = {
  invalidEmail: "Email or password is incorrect.",
  invalidPassword: "Email or password is incorrect.",
  resetPassword: "Please reset your password via the link we sent to your email.",
};

// cfw-hb3: deployed cfw login fails with 502 while the same WIX_CLIENT_ID_HEADLESS
// works locally. Wraps a 502 response with a sanitized env+runtime+error
// fingerprint so a curl with `x-debug-token: $WIX_AUTH_DEBUG_TOKEN` can
// retrieve the actual SDK error from production without needing Vercel logs
// access. The full diag is also captured to Sentry via logWixFailure.
function failWith502(req: NextRequest, err: unknown, userMessage: string) {
  const diag = buildAuthDiag(err);
  const body: Record<string, unknown> = { error: userMessage };
  if (diagAuthorized(req)) body.diag = diag;
  return NextResponse.json(body, { status: 502 });
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
  } catch (err) {
    // cfw-ipr: malformed input (e.g. "@@") makes Wix's client-side validation
    // throw. Surface 422 with a user-facing message and skip Sentry capture
    // — user typos are not actionable and pollute 502-rate alerts.
    const kind = classifyAuthInputError(err);
    if (kind) {
      return NextResponse.json(
        { error: AUTH_INPUT_ERROR_MESSAGES[kind] },
        { status: 422 },
      );
    }
    await logWixFailure("auth/login", "client.auth.login", err);
    return failWith502(req, err, "Sign-in failed. Please try again.");
  }

  if (state.loginState === LoginState.SUCCESS) {
    let tokens;
    try {
      tokens = await client.auth.getMemberTokensForDirectLogin(
        (state as { data: { sessionToken: string } }).data.sessionToken,
      );
    } catch (err) {
      await logWixFailure(
        "auth/login",
        "getMemberTokensForDirectLogin",
        err,
      );
      return failWith502(req, err, "Sign-in failed. Please try again.");
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
