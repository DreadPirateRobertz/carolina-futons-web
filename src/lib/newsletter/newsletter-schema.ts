// Pure validator for newsletter signup. Kept framework-free so the Server
// Action, the future API route (if any), and the client form all share one
// source of truth for the rules.

export type NewsletterRequest = {
  email: string;
};

export type NewsletterErrors = Partial<Record<keyof NewsletterRequest, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 254;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function coerceNewsletterRequest(input: unknown): NewsletterRequest {
  const obj = (input ?? {}) as Record<string, unknown>;
  return { email: str(obj.email).toLowerCase() };
}

export function validateNewsletterRequest(
  req: NewsletterRequest,
): NewsletterErrors {
  const errors: NewsletterErrors = {};
  if (!req.email) errors.email = "Please enter your email.";
  else if (req.email.length > MAX_EMAIL) errors.email = "That email is too long.";
  else if (!EMAIL_RE.test(req.email))
    errors.email = "That email doesn't look right.";
  return errors;
}

export function hasNewsletterErrors(errors: NewsletterErrors): boolean {
  return Object.keys(errors).length > 0;
}
