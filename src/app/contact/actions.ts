"use server";

import nodemailer from "nodemailer";

import { BUSINESS } from "@/lib/business/contact-info";
import {
  coerceContactRequest,
  hasContactErrors,
  validateContactRequest,
  type ContactRequest,
} from "@/lib/contact/contact-schema";
import type { ContactActionState } from "@/app/contact/contact-state";

// cf-contact-form: /contact Server Action. Validates inbound submissions
// with the shared contact-schema rules (one source of truth with the client),
// builds a nodemailer SMTP transport from env, and delivers to BUSINESS.email.
//
// Shape is designed for `useActionState`: the form binds this action and
// renders { status, errors?, values? } directly — on error we echo back the
// submitted values so the user doesn't have to retype everything.
// `ContactActionState` + `initialContactActionState` live in
// `./contact-state` because `"use server"` modules may only export async
// functions.

function readEnv(): { host: string; port: number; user: string; pass: string } | null {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !portRaw || !user || !pass) return null;
  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) return null;
  return { host, port, user, pass };
}

function buildBody(req: ContactRequest): string {
  const phoneLine = req.phone ? `Phone: ${req.phone}\n` : "";
  return (
    `New message from the carolinafutons.com contact form.\n\n` +
    `Name: ${req.name}\n` +
    `Email: ${req.email}\n` +
    phoneLine +
    `Subject: ${req.subject}\n\n` +
    `${req.message}\n`
  );
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

  const env = readEnv();
  if (!env) {
    console.error("[contact-form] SMTP env vars missing — cannot send");
    return {
      status: "error",
      errors: {},
      transportError: "Our mail server isn't configured yet — please email us directly.",
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
      replyTo: `"${req.name}" <${req.email}>`,
      subject: `[Website] ${req.subject}`,
      text: buildBody(req),
    });
  } catch (err) {
    console.error("[contact-form] sendMail failed:", err);
    return {
      status: "error",
      errors: {},
      transportError: "We couldn't send that — please try again in a moment.",
      values: req,
    };
  }

  return { status: "success" };
}
