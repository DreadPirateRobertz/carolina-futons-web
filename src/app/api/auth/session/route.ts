import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import type { OauthData } from "@wix/sdk";
import { getWixClientWithTokens } from "@/lib/wix-client";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  parseSessionCookie,
  serializeSessionTokens,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const OAUTH_DATA_COOKIE = "wix-oauth-data";
const OAUTH_DATA_TTL_SECONDS = 600;

// Pass explicit path to delete so it matches the path we set — otherwise the
// delete silently no-ops if SESSION_COOKIE_OPTIONS.path ever diverges from
// Next's default "/" (blaidd #12 review).
const deleteSessionCookie = (jar: Awaited<ReturnType<typeof cookies>>, name: string) =>
  jar.delete({ name, path: SESSION_COOKIE_OPTIONS.path });

function callbackUrl(req: NextRequest): string {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}/api/auth/session`;
}

function safeOriginalUri(raw: string | null | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    callbackUrl?: string;
  };
  const originalUri = safeOriginalUri(body.callbackUrl);

  const client = getWixClientWithTokens();
  const oauthData = client.auth.generateOAuthData(callbackUrl(req), originalUri);
  const { authUrl } = await client.auth.getAuthUrl(oauthData);

  const jar = await cookies();
  jar.set(OAUTH_DATA_COOKIE, JSON.stringify(oauthData), {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: OAUTH_DATA_TTL_SECONDS,
  });

  return NextResponse.json({ authUrl });
}

export async function GET(req: NextRequest) {
  const jar = await cookies();
  const oauthJar = jar.get(OAUTH_DATA_COOKIE);
  if (!oauthJar) {
    return NextResponse.redirect(new URL("/?auth_error=missing_state", req.url));
  }

  let oauthData: OauthData;
  try {
    oauthData = JSON.parse(oauthJar.value) as OauthData;
  } catch {
    deleteSessionCookie(jar, OAUTH_DATA_COOKIE);
    return NextResponse.redirect(new URL("/?auth_error=bad_state", req.url));
  }

  const client = getWixClientWithTokens();
  const parsed = client.auth.parseFromUrl(req.url, "query");
  if (parsed.error || !parsed.code || !parsed.state) {
    deleteSessionCookie(jar, OAUTH_DATA_COOKIE);
    const code = parsed.error ?? "missing_code";
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(code)}`, req.url),
    );
  }

  const tokens = await client.auth.getMemberTokens(
    parsed.code,
    parsed.state,
    oauthData,
  );

  jar.delete(OAUTH_DATA_COOKIE);
  jar.set(SESSION_COOKIE_NAME, serializeSessionTokens(tokens), {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 4 * 60 * 60,
  });

  return NextResponse.redirect(new URL(oauthData.originalUri ?? "/", req.url));
}

export async function DELETE(req: NextRequest) {
  const jar = await cookies();
  const existing = parseSessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  deleteSessionCookie(jar, SESSION_COOKIE_NAME);
  deleteSessionCookie(jar, OAUTH_DATA_COOKIE);

  if (!existing) {
    return NextResponse.json({ ok: true });
  }

  const client = getWixClientWithTokens(existing);
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}/`;
  const { logoutUrl } = await client.auth.logout(origin);
  return NextResponse.json({ ok: true, logoutUrl });
}
