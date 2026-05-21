// cfw-921: Q&A types + validation. Shared between the server action,
// API route, and client form — one source of truth for field rules.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_QUESTION = 500;
const MAX_NAME = 80;

export type QaItem = {
  _id: string;
  productSlug: string;
  question: string;
  askedBy: string;
  askedAt: string;
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  helpfulCount: number;
  status: "pending" | "answered";
};

export type SubmitQaInput = {
  productSlug: string;
  question: string;
  name?: string;
  email?: string;
};

export type QaErrors = Partial<
  Record<keyof Omit<SubmitQaInput, "productSlug">, string>
>;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function coerceQaInput(
  raw: unknown,
  productSlug: string,
): SubmitQaInput {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    productSlug,
    question: str(obj.question),
    name: str(obj.name) || undefined,
    email: str(obj.email) || undefined,
  };
}

export function validateQaInput(input: SubmitQaInput): QaErrors {
  const errors: QaErrors = {};
  if (!input.question) errors.question = "Please enter your question.";
  else if (input.question.length > MAX_QUESTION)
    errors.question = `Question must be under ${MAX_QUESTION} characters.`;
  if (input.name && input.name.length > MAX_NAME)
    errors.name = "Name is too long.";
  if (input.email && !EMAIL_RE.test(input.email))
    errors.email = "That email doesn't look right.";
  return errors;
}

export function hasQaErrors(errors: QaErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function maskName(name: string | undefined): string {
  if (!name) return "Anonymous";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return `${parts[0][0]}.`;
  return `${parts[0][0]}. ${parts[parts.length - 1][0]}.`;
}
