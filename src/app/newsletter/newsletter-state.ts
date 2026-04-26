import type { NewsletterErrors } from "@/lib/newsletter/newsletter-schema";

// Constant + type extracted from `actions.ts` so they live outside the
// `"use server"` module. Next.js Server Action modules may only export
// async functions; exporting `initialNewsletterActionState` (an object)
// from `actions.ts` would surface as a Next.js build error at any page
// that imports it. Mirrors the pattern used for /contact (cf-3qt.4.6 /
// contact-state.ts) and /dashboard/preferences (preferences-state.ts).

export type NewsletterActionState =
  | { status: "idle" }
  | { status: "error"; errors: NewsletterErrors; storeError?: string }
  | { status: "success"; alreadySubscribed: boolean };

export const initialNewsletterActionState: NewsletterActionState = {
  status: "idle",
};
