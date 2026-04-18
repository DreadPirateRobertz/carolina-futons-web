// Pure validator for POST /api/contact. Kept framework-free so the API route
// and the client form can share the same rules — one source of truth for
// error copy + field names means the two can never drift.

export type ContactRequest = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
};

export type ContactErrors = Partial<Record<keyof ContactRequest, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_MESSAGE = 10;
const MAX_MESSAGE = 2000;
const MAX_SUBJECT = 120;
const MAX_NAME = 80;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function coerceContactRequest(input: unknown): ContactRequest {
  const obj = (input ?? {}) as Record<string, unknown>;
  return {
    name: str(obj.name),
    email: str(obj.email),
    phone: str(obj.phone) || undefined,
    subject: str(obj.subject),
    message: str(obj.message),
  };
}

export function validateContactRequest(req: ContactRequest): ContactErrors {
  const errors: ContactErrors = {};
  if (!req.name) errors.name = "Please tell us your name.";
  else if (req.name.length > MAX_NAME) errors.name = "Name is too long.";

  if (!req.email) errors.email = "Please share an email so we can reply.";
  else if (!EMAIL_RE.test(req.email)) errors.email = "That email doesn't look right.";

  if (!req.subject) errors.subject = "Add a subject line.";
  else if (req.subject.length > MAX_SUBJECT) errors.subject = "Subject is too long.";

  if (!req.message) errors.message = "Please include a message.";
  else if (req.message.length < MIN_MESSAGE)
    errors.message = `Message must be at least ${MIN_MESSAGE} characters.`;
  else if (req.message.length > MAX_MESSAGE)
    errors.message = `Message must be under ${MAX_MESSAGE} characters.`;

  return errors;
}

export function hasContactErrors(errors: ContactErrors): boolean {
  return Object.keys(errors).length > 0;
}
