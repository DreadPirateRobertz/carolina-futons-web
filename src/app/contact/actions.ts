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
// Soft-pedal the actual 1-hour rate window into "few minutes" copy — a
// returning customer reading the literal "1 hour" panics; "few minutes"
// matches the way someone would naturally re-try after seeing this.
const TRANSPORT_ERROR_RATE_LIMIT =
  "We've received a few from this address recently — please try again in a few minutes.";
// Cap on Velo error strings before they hit the form. Belt-and-suspenders:
// emailService author-controls every message today, but a future endpoint
// owner shouldn't be able to dump a 5KB payload into a UI field by accident.
const VELO_ERROR_MAX_LEN = 200;
// Vercel functions kill long-running invocations, but we want a friendlier
// timeout error before that fires. 8s covers the 99th-percentile Wix latency
// observed in past incidents while leaving headroom under the platform cap.
const FETCH_TIMEOUT_MS = 8000;

type VeloResponse = { success: boolean; error?: string };

function transportFailure(
  values: ContactRequest,
  transportError: string,
): ContactActionState {
  return { status: "error", errors: {}, transportError, values };
}

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
      body: JSON.stringify(req),
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    console.error("[contact-form] fetch to Velo failed:", err);
    return transportFailure(req, TRANSPORT_ERROR_GENERIC);
  }

  if (res.ok) {
    return { status: "success" };
  }

  // 429 = per-email rate limit on the Velo side. Surface a distinct copy so
  // a returning customer understands they aren't being rejected — they're
  // already in the queue.
  if (res.status === 429) {
    return transportFailure(req, TRANSPORT_ERROR_RATE_LIMIT);
  }

  let veloError: string | undefined;
  try {
    const body = (await res.json()) as VeloResponse;
    if (body && typeof body.error === "string") {
      veloError = body.error.slice(0, VELO_ERROR_MAX_LEN);
    }
  } catch (parseErr) {
    // Best-effort: if Velo's body isn't JSON, fall through to generic copy.
    // Logged so a future regression in the wire contract is visible in ops.
    console.error("[contact-form] failed to parse Velo error body:", parseErr);
  }
  console.error(
    "[contact-form] Velo endpoint rejected submission:",
    res.status,
    veloError,
  );
  return transportFailure(req, veloError ?? TRANSPORT_ERROR_GENERIC);
}
