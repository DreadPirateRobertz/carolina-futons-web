// cfw-ipr: classifier for Wix auth SDK throws so /api/auth/login and
// /api/auth/register can distinguish 4xx-class user-input errors (malformed
// email, malformed password) from upstream/runtime failures. Without this,
// a malformed email like "@@" makes Wix's client-side validation throw, the
// catch hits failWith502(), and we surface a 502 + Sentry event for what is
// really a user typo.
//
// Kept self-contained (no `@/lib/wix/errors` import) so the auth route tests
// that mock `@/lib/wix/errors` wholesale don't have to know about this
// classifier's internal shape predicate.

export type WixAuthInputErrorKind =
  | "invalidEmail"
  | "invalidPassword"
  | "invalidInput";

type WixSdkErrorShape = {
  code?: unknown;
  details?: { applicationError?: { code?: unknown } };
  response?: { status?: unknown };
};

/**
 * Returns the validation kind when the thrown error looks like Wix client-side
 * input validation, or `null` for everything else (network, 5xx, programmer
 * bug). Matches the criteria from cfw-ipr:
 *   - top-level `code` (or `details.applicationError.code`) of `invalidEmail`
 *     or `invalidPassword`
 *   - generic `response.status === 400` from Wix without a known code
 *
 * Routes should return 422 with a user-facing message in the validation case
 * and skip Sentry capture — these errors are user typos, not actionable.
 */
export function classifyAuthInputError(
  err: unknown,
): WixAuthInputErrorKind | null {
  if (typeof err !== "object" || err === null) return null;
  const e = err as WixSdkErrorShape;
  const topCode = typeof e.code === "string" ? e.code : undefined;
  const appCode =
    typeof e.details?.applicationError?.code === "string"
      ? e.details.applicationError.code
      : undefined;
  const code = topCode ?? appCode;
  if (code === "invalidEmail") return "invalidEmail";
  if (code === "invalidPassword") return "invalidPassword";
  if (typeof e.response?.status === "number" && e.response.status === 400) {
    return "invalidInput";
  }
  return null;
}

export const AUTH_INPUT_ERROR_MESSAGES: Record<WixAuthInputErrorKind, string> =
  {
    invalidEmail: "That email address is invalid.",
    invalidPassword: "That password is invalid.",
    invalidInput: "Please check your email and password.",
  };
