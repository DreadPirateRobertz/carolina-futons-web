import type {
  ContactErrors,
  ContactRequest,
} from "@/lib/contact/contact-schema";

// Extracted from `actions.ts` so the constant + types live outside the
// `"use server"` module. Next.js Server Action modules may only export async
// functions; exporting `initialContactActionState` from `actions.ts` made
// `useActionState` receive an RPC reference instead of a plain object,
// breaking the contact form on first hydration.

export type ContactActionState =
  | { status: "idle" }
  | {
      status: "error";
      errors: ContactErrors;
      transportError?: string;
      values: ContactRequest;
    }
  | { status: "success" };

export const initialContactActionState: ContactActionState = { status: "idle" };
