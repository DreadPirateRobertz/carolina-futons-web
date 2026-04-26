"use server";

import { optionalEnv } from "@/lib/env";
import {
  coerceContactRequest,
  hasContactErrors,
  validateContactRequest,
  type ContactRequest,
} from "@/lib/contact/contact-schema";
import type { ContactActionState } from "@/app/contact/contact-state";

// cf-3qt.4.6: /contact Server Action. Validates inbound submissions with the
// shared contact-schema rules (one source of truth with the client), then
// hands off to the Velo /_functions/contactSubmissions HTTP endpoint —
// reusing the existing rate-limit, sanitize, and triggered-email pipeline
// (emailService.sendEmail). Replaces the standalone nodemailer SMTP
// transport so contact submissions flow through the same notification path
// as the legacy Wix Studio site.
//
// Shape is designed for `useActionState`: the form binds this action and
// renders { status, errors?, values? } directly — on error we echo back the
// submitted values so the user doesn't have to retype everything.
// `ContactActionState` + `initialContactActionState` live in
// `./contact-state` because `"use server"` modules may only export async
// functions.

const TRANSPORT_ERROR_GENERIC =
  "We couldn't send that — please try again in a moment.";
const TRANSPORT_ERROR_RATE_LIMIT =
  "We've received a few from this address recently — please try again in a few minutes.";

type VeloResponse = { success: boolean; error?: string };

export async function sendContactForm(
  _prev: ContactActionState | null,
  formData: FormData,
): Promise<ContactActionState> {
  const raw: Record<string, unknown> = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  };
  const req = coerceContactRequest(raw);
  const errors = validateContactRequest(req);
  if (hasContactErrors(errors)) {
    return { status: "error", errors, values: req };
  }

  const endpoint = `${optionalEnv("WIX_VELO_SITE_URL")}/_functions/contactSubmissions`;
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req satisfies ContactRequest),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[contact-form] fetch to Velo failed:", err);
    return {
      status: "error",
      errors: {},
      transportError: TRANSPORT_ERROR_GENERIC,
      values: req,
    };
  }

  if (res.ok) {
    return { status: "success" };
  }

  // 429 = per-email rate limit on the Velo side. Surface a distinct copy so
  // a returning customer understands they aren't being rejected — they're
  // already in the queue.
  if (res.status === 429) {
    return {
      status: "error",
      errors: {},
      transportError: TRANSPORT_ERROR_RATE_LIMIT,
      values: req,
    };
  }

  let veloError: string | undefined;
  try {
    const body = (await res.json()) as VeloResponse;
    if (body && typeof body.error === "string") veloError = body.error;
  } catch {
    // swallow — generic error below covers it
  }
  console.error(
    "[contact-form] Velo endpoint rejected submission:",
    res.status,
    veloError,
  );
  return {
    status: "error",
    errors: {},
    transportError: veloError ?? TRANSPORT_ERROR_GENERIC,
    values: req,
  };
}
