import type { QuizAnswers } from "@/lib/wix/style-quiz";

export function encodeResultToken(answers: QuizAnswers): string {
  return btoa(JSON.stringify(answers))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function decodeResultToken(token: string): QuizAnswers | null {
  try {
    const padded = token.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4;
    const b64 = pad ? padded + "=".repeat(4 - pad) : padded;
    const data: unknown = JSON.parse(atob(b64));
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return null;
    }
    return data as QuizAnswers;
  } catch {
    return null;
  }
}
