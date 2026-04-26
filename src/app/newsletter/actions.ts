"use server";

import {
  coerceNewsletterRequest,
  hasNewsletterErrors,
  validateNewsletterRequest,
} from "@/lib/newsletter/newsletter-schema";
import { upsertSubscriber } from "@/lib/newsletter/newsletter-store";
import type { NewsletterActionState } from "@/app/newsletter/newsletter-state";

// cf-newsletter-footer: Server Action for the footer signup.
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
      `[newsletter] ${created ? "NEW" : "DUPLICATE"} subscriber: ${req.email}`,
    );
    return { status: "success", alreadySubscribed: !created };
  } catch (err) {
    console.error("[newsletter] upsertSubscriber failed:", err);
    return {
      status: "error",
      errors: {},
      storeError: "We couldn't save that right now — please try again shortly.",
    };
  }
}
