"use server";

import {
  coerceNewsletterRequest,
  hasNewsletterErrors,
  validateNewsletterRequest,
} from "@/lib/newsletter/newsletter-schema";
import {
  upsertSubscriber,
  NewsletterRateLimitError,
} from "@/lib/newsletter/newsletter-store";
import { hashEmail } from "@/lib/log/hash-pii";
import type { NewsletterActionState } from "@/app/newsletter/newsletter-state";

// Endpoint-only — no /newsletter page route exists or is planned (cf-7ue0).
// This Server Action backs NewsletterSignup in the footer and any inline
// signup sections. /newsletter 404s intentionally; that is not a bug.
// Designed for `useActionState`: the form binds this and renders directly
// off { status, errors?, alreadySubscribed?, storeError? }. Store errors
// are logged server-side and surfaced as a friendly message — the user
// never sees a raw stack trace.
// `NewsletterActionState` + `initialNewsletterActionState` live in
// `./newsletter-state` because `"use server"` modules may only export
// async functions.

export async function subscribeToNewsletter(
  _prev: NewsletterActionState | null,
  formData: FormData,
): Promise<NewsletterActionState> {
  const req = coerceNewsletterRequest({ email: formData.get("email") });
  const errors = validateNewsletterRequest(req);
  if (hasNewsletterErrors(errors)) {
    return { status: "error", errors };
  }

  try {
    const { created } = await upsertSubscriber(req.email);
    console.log(
      `[newsletter] ${created ? "NEW" : "DUPLICATE"} subscriber: ${hashEmail(req.email)}`,
    );
    return { status: "success", alreadySubscribed: !created };
  } catch (err) {
    if (err instanceof NewsletterRateLimitError) {
      console.warn("[newsletter] rate-limited:", hashEmail(req.email));
      return {
        status: "error",
        errors: {},
        storeError: "Too many attempts — please try again in a few minutes.",
      };
    }
    console.error("[newsletter] upsertSubscriber failed:", err);
    return {
      status: "error",
      errors: {},
      storeError: "We couldn't save that right now — please try again shortly.",
    };
  }
}
