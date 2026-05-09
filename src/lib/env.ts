// Typed env accessor. Throws on missing required keys at call time so
// misconfigured deploys fail loudly at the first request instead of surfacing
// as a vague `undefined` deep inside a Wix call.
//
// Zero deps intentional — Phase 0 doesn't need zod yet. rennala can swap to
// schema validation in Phase 3 when auth env (OAuth token URLs, cookie names)
// lands.

// Names listed here form the RequiredKey union below — `typeof _REQUIRED` is
// the only consumer, so the leading underscore silences the unused-var lint.
const _REQUIRED = [
  "WIX_CLIENT_ID_HEADLESS",
  "WIX_BACKEND_KEY",
  "WIX_WEBHOOK_SECRET",
  // cfw-6qd.14: site-scoped Wix REST API key for /api/admin/image-upload
  // (cfw-6qd.8). Distinct from WIX_BACKEND_KEY — Stilgar rotated this one
  // specifically for the owner-mode image-upload flow on 2026-05-09.
  "WIX_API_KEY",
] as const;

const OPTIONAL_WITH_DEFAULT: Record<string, string> = {
  WIX_VELO_SITE_URL: "https://www.carolinafutons.com",
};

type RequiredKey = (typeof _REQUIRED)[number];
type OptionalKey = keyof typeof OPTIONAL_WITH_DEFAULT;

export function env(key: RequiredKey): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(
      `Missing required env var: ${key}. Add to .env.local (local) or Vercel env (deploys).`,
    );
  }
  return value;
}

export function optionalEnv(key: OptionalKey): string {
  const value = process.env[key];
  return value && value.length > 0 ? value : OPTIONAL_WITH_DEFAULT[key];
}
