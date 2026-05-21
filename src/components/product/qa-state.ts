// Extracted from qa-actions.ts so the constant + types live outside the
// "use server" module. Next.js Server Action modules may only export async
// functions; exporting initialQaState from the actions module would send
// an RPC reference instead of a plain object to useActionState.

import type { QaErrors, SubmitQaInput } from "@/lib/qa/qa-schema";

export type QaActionState =
  | { status: "idle" }
  | {
      status: "error";
      errors: QaErrors;
      values: Omit<SubmitQaInput, "productSlug">;
      transportError?: string;
    }
  | { status: "success" };

export const initialQaState: QaActionState = { status: "idle" };
