import type { Tokens } from "@wix/sdk";

export const SESSION_COOKIE_NAME = "wix-session";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function parseSessionCookie(value: string | undefined | null): Tokens | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isTokensShape(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function serializeSessionTokens(tokens: Tokens): string {
  return JSON.stringify(tokens);
}

export function safeCallbackUrl(raw: string | null | undefined): string {
  if (!raw) return "/dashboard";
  // Reject protocol-relative (//evil.com) and backslash-bypass (/\evil.com —
  // some browsers normalize /\ to // on navigation).
  if (!/^\/[^/\\]/.test(raw)) return "/dashboard";
  return raw;
}

function isTokensShape(value: unknown): value is Tokens {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const access = v.accessToken as Record<string, unknown> | undefined;
  const refresh = v.refreshToken as Record<string, unknown> | undefined;
  return (
    typeof access === "object" &&
    access !== null &&
    typeof access.value === "string" &&
    typeof refresh === "object" &&
    refresh !== null &&
    typeof refresh.value === "string"
  );
}
