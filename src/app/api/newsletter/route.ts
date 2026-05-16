// /api/newsletter — newsletter (mailing list) signup proxy.
//
// Wire contract:
//   POST { email: string }
//   → 200 { ok: true, alreadySubscribed?: boolean }
//   → 400 { ok: false, error: "invalid-json" | "invalid-email" }
//   → 429 { ok: false, error: "rate-limited" }
//   → 502 { ok: false, error: "velo-error" | "velo-unreachable" }
//
// Delegates to Wix Velo /_functions/mailingListSignups via the shared
// `upsertSubscriber` helper, so this route and the existing
// `subscribeToNewsletter` server action both flow through the same Velo
// endpoint and apply the same email-validation rules.
//
// CSRF: signup is unauthenticated and the Velo backend is the source of
// truth for de-duplication and rate-limiting (returns 429 to us). No
// cookie-bound state is changed here, so a token is not required.
//
// When WIX_VELO_SITE_URL is not set (CI / local dev) the helper throws;
// we treat that as a soft acknowledgement so previews/storybook flows
// don't 500.

import { NextResponse } from "next/server";

import { hashEmail } from "@/lib/log/hash-pii";
import { logError } from "@/lib/observability/log";
import {
  coerceNewsletterRequest,
  hasNewsletterErrors,
  validateNewsletterRequest,
} from "@/lib/newsletter/newsletter-schema";
import {
  upsertSubscriber,
  NewsletterRateLimitError,
} from "@/lib/newsletter/newsletter-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-json" },
      { status: 400 },
    );
  }

  const req = coerceNewsletterRequest(body);
  const errors = validateNewsletterRequest(req);
  if (hasNewsletterErrors(errors)) {
    return NextResponse.json(
      { ok: false, error: "invalid-email" },
      { status: 400 },
    );
  }

  if (!process.env.WIX_VELO_SITE_URL) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { created } = await upsertSubscriber(req.email);
    return NextResponse.json({ ok: true, alreadySubscribed: !created });
  } catch (err) {
    if (err instanceof NewsletterRateLimitError) {
      console.warn("[api/newsletter] rate-limited:", hashEmail(req.email));
      return NextResponse.json(
        { ok: false, error: "rate-limited" },
        { status: 429 },
      );
    }
    if (err instanceof Error && err.name === "TimeoutError") {
      logError("api/newsletter", "velo timeout", err);
      return NextResponse.json(
        { ok: false, error: "velo-unreachable" },
        { status: 502 },
      );
    }
    logError("api/newsletter", "upsertSubscriber failed", err);
    return NextResponse.json(
      { ok: false, error: "velo-error" },
      { status: 502 },
    );
  }
}
