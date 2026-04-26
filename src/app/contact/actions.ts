"use server";

import * as Sentry from "@sentry/nextjs";
import { optionalEnv } from "@/lib/env";
import {
  coerceContactRequest,
  hasContactErrors,
  validateContactRequest,
  type ContactRequest,
} from "@/lib/contact/contact-schema";
import type { ContactActionState } from "@/app/contact/contact-state";
import type {
  AppointmentActionState,
  AppointmentErrors,
  AppointmentRequest,
} from "@/app/contact/appointment-state";

const TRANSPORT_ERROR_GENERIC =
  "We couldn't send that — please try again in a moment.";
const TRANSPORT_ERROR_RATE_LIMIT =
  "We've received a few from this address recently — please try again in a few minutes.";
const TRANSPORT_ERROR_CAPTCHA_NETWORK =
  "We couldn't verify your request right now — please try again in a moment.";
const VELO_ERROR_MAX_LEN = 200;
const FETCH_TIMEOUT_MS = 8000;
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type VeloResponse = { success: boolean; error?: string };

function captureWithId(err: unknown, context: string): string {
  const errorId = crypto.randomUUID();
  Sentry.captureException(err, { extra: { context, errorId } });
  return errorId;
}

function transportFailure(
  values: ContactRequest,
  transportError: string,
): ContactActionState {
  return { status: "error", errors: {}, transportError, values };
}

async function verifyTurnstile(
  token: string,
): Promise<{ ok: boolean; networkError?: boolean }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true };
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
      signal: AbortSignal.timeout(5_000),
    });
    const data = (await res.json()) as { success: boolean };
    return { ok: data.success === true };
  } catch (err) {
    const errorId = captureWithId(err, "verifyTurnstile");
    console.error("[contact-form] Turnstile verify failed:", errorId, err);
    return { ok: false, networkError: true };
  }
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
    sizeOfInterest: formData.get("sizeOfInterest"),
  };
  const req = coerceContactRequest(raw);
  const errors = validateContactRequest(req);
  if (hasContactErrors(errors)) {
    return { status: "error", errors, values: req };
  }

  // Gate on TURNSTILE_SECRET_KEY (server secret). In production, a missing
  // secret is a deployment misconfiguration — hard-fail so prod never accepts
  // unverified submissions. In dev/test the bypass lets local work proceed
  // without keys configured.
  const turnstileToken = formData.get("cf-turnstile-response");
  const hasSecret = !!process.env.TURNSTILE_SECRET_KEY;
  if (!hasSecret && process.env.NODE_ENV === "production") {
    const errorId = captureWithId(
      new Error("TURNSTILE_SECRET_KEY not set in production"),
      "sendContactForm:captchaConfig",
    );
    console.error(
      "[contact-form] TURNSTILE_SECRET_KEY not set in production — blocking submission:",
      errorId,
    );
    return transportFailure(req, TRANSPORT_ERROR_GENERIC);
  }
  if (hasSecret) {
    if (typeof turnstileToken !== "string" || !turnstileToken) {
      return transportFailure(req, "Please complete the CAPTCHA.");
    }
    const { ok, networkError } = await verifyTurnstile(turnstileToken);
    if (!ok) {
      return transportFailure(
        req,
        networkError ? TRANSPORT_ERROR_CAPTCHA_NETWORK : "Please complete the CAPTCHA.",
      );
    }
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
    console.error("[contact-form] failed to parse Velo error body:", parseErr);
  }
  console.error(
    "[contact-form] Velo endpoint rejected submission:",
    res.status,
    veloError,
  );
  return transportFailure(req, veloError ?? TRANSPORT_ERROR_GENERIC);
}

// Showroom hours: Wed–Sat 10am–5pm. Last slot is 4pm (1hr visit).
const APPOINTMENT_TIMES: Record<string, string> = {
  "10:00": "10:00 AM",
  "11:00": "11:00 AM",
  "12:00": "12:00 PM",
  "13:00": "1:00 PM",
  "14:00": "2:00 PM",
  "15:00": "3:00 PM",
  "16:00": "4:00 PM",
};

function validateAppointment(req: AppointmentRequest): AppointmentErrors {
  const errors: AppointmentErrors = {};
  if (!req.appointmentName.trim()) errors.appointmentName = "Name is required.";
  if (!req.appointmentEmail.trim()) {
    errors.appointmentEmail = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.appointmentEmail)) {
    errors.appointmentEmail = "Please enter a valid email address.";
  }
  if (!req.appointmentDate) {
    errors.appointmentDate = "Please select a date.";
  } else {
    const d = new Date(req.appointmentDate + "T00:00:00");
    const day = d.getDay(); // 1=Mon…6=Sat, 0=Sun; open days are 3–6
    if (d < new Date(new Date().toDateString())) {
      errors.appointmentDate = "Please choose a future date.";
    } else if (![3, 4, 5, 6].includes(day)) {
      errors.appointmentDate = "We're open Wednesday through Saturday.";
    }
  }
  if (!APPOINTMENT_TIMES[req.appointmentTime]) {
    errors.appointmentTime = "Please select a time.";
  }
  return errors;
}

function buildAppointmentBody(req: AppointmentRequest): string {
  const timeLabel = APPOINTMENT_TIMES[req.appointmentTime] ?? req.appointmentTime;
  return (
    `New showroom appointment request from carolinafutons.com.\n\n` +
    `Name: ${req.appointmentName}\n` +
    `Email: ${req.appointmentEmail}\n` +
    `Requested date: ${req.appointmentDate}\n` +
    `Requested time: ${timeLabel}\n`
  );
}

export async function bookAppointment(
  _prev: AppointmentActionState | null,
  formData: FormData,
): Promise<AppointmentActionState> {
  const req: AppointmentRequest = {
    appointmentName: String(formData.get("appointmentName") ?? "").trim(),
    appointmentEmail: String(formData.get("appointmentEmail") ?? "").trim(),
    appointmentDate: String(formData.get("appointmentDate") ?? "").trim(),
    appointmentTime: String(formData.get("appointmentTime") ?? "").trim(),
  };

  const errors = validateAppointment(req);
  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, values: req };
  }

  const env = readEnv();
  if (!env) {
    console.error("[appointment-form] SMTP env vars missing — cannot send");
    return {
      status: "error",
      errors: {},
      transportError: "Our booking system isn't configured yet — please call us to schedule.",
      values: req,
    };
  }

  const transport = nodemailer.createTransport({
    host: env.host,
    port: env.port,
    secure: env.port === 465,
    auth: { user: env.user, pass: env.pass },
  });

  try {
    await transport.sendMail({
      from: `"Carolina Futons Website" <${env.user}>`,
      to: BUSINESS.email,
      replyTo: { name: req.appointmentName, address: req.appointmentEmail },
      subject: `[Appointment] ${req.appointmentDate} at ${APPOINTMENT_TIMES[req.appointmentTime] ?? req.appointmentTime}`,
      text: buildAppointmentBody(req),
    });
  } catch (err) {
    console.error("[appointment-form] sendMail failed:", err);
    return {
      status: "error",
      errors: {},
      transportError: "We couldn't send that — please try again or call us directly.",
      values: req,
    };
  }

  return {
    status: "success",
    date: req.appointmentDate,
    time: APPOINTMENT_TIMES[req.appointmentTime] ?? req.appointmentTime,
  };
}
