"use server";

import * as Sentry from "@sentry/nextjs";
import { optionalEnv } from "@/lib/env";
import { listCollectionItems } from "@/lib/wix/data";
import {
  coerceSwatchContactInfo,
  hasSwatchContactErrors,
  validateSwatchContactInfo,
  validateSwatchIds,
  type SwatchItem,
  type SwatchContactInfo,
} from "@/lib/swatch-request/swatch-request-schema";
import type { SwatchRequestActionState } from "@/app/swatch-request/swatch-request-state";

const TRANSPORT_ERROR_GENERIC =
  "We couldn't submit that — please try again in a moment.";
const TRANSPORT_ERROR_RATE_LIMIT =
  "We've received a few requests from this address — please try again in a few minutes.";
const TRANSPORT_ERROR_CAPTCHA_NETWORK =
  "We couldn't verify your request right now — please try again in a moment.";
const FETCH_TIMEOUT_MS = 10_000;
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type VeloResponse = { success: boolean; requestId?: string; error?: string };

export type SwatchListResult = {
  items: SwatchItem[];
  // Set when the CMS read failed — page hides the form and shows an error
  // banner rather than rendering an empty swatch selector.
  error?: boolean;
};

function captureWithId(err: unknown, context: string): string {
  const errorId = crypto.randomUUID();
  Sentry.captureException(err, { extra: { context, errorId } });
  return errorId;
}

function transportFailure(
  values: SwatchContactInfo,
  selectedIds: string[],
  transportError: string,
): SwatchRequestActionState {
  return { status: "error", errors: {}, transportError, values, selectedIds };
}

// Returns { networkError: true } on fetch/timeout failures so callers can
// distinguish "Cloudflare couldn't be reached" from "token rejected".
async function verifyTurnstile(
  token: string,
): Promise<{ ok: boolean; networkError?: boolean }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // Caller guards against calling this without a secret; defensive check only.
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
    console.error("[swatch-request] Turnstile verify failed:", errorId, err);
    return { ok: false, networkError: true };
  }
}

export async function listSwatchesAction(): Promise<SwatchListResult> {
  try {
    const items = await listCollectionItems<
      SwatchItem & { sortOrder?: number }
    >("FabricSwatches", 100);
    return {
      items: items
        .filter(({ _id, swatchName }) => !!_id && !!swatchName)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map(({ _id, swatchName, colorFamily, colorHex }) => ({
          _id: _id as string,
          swatchName: swatchName as string,
          colorFamily,
          colorHex,
        })),
    };
  } catch (err) {
    const errorId = captureWithId(err, "listSwatchesAction");
    console.error("[swatch-request] listSwatchesAction failed:", errorId, err);
    return { items: [], error: true };
  }
}

export async function submitSwatchRequestAction(
  _prev: SwatchRequestActionState | null,
  formData: FormData,
): Promise<SwatchRequestActionState> {
  const selectedIds = formData.getAll("swatchIds").map(String);

  const contactInfo = coerceSwatchContactInfo({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address1: formData.get("address1"),
    address2: formData.get("address2"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
  });

  const swatchError = validateSwatchIds(selectedIds);
  const contactErrors = validateSwatchContactInfo(contactInfo);

  if (swatchError || hasSwatchContactErrors(contactErrors)) {
    return {
      status: "error",
      errors: {
        ...(swatchError ? { swatchIds: swatchError } : {}),
        ...(hasSwatchContactErrors(contactErrors)
          ? { contact: contactErrors }
          : {}),
      },
      values: contactInfo,
      selectedIds,
    };
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
      "submitSwatchRequestAction:captchaConfig",
    );
    console.error("[swatch-request] TURNSTILE_SECRET_KEY not set in production — blocking submission:", errorId);
    return transportFailure(contactInfo, selectedIds, TRANSPORT_ERROR_GENERIC);
  }
  if (hasSecret) {
    if (typeof turnstileToken !== "string" || !turnstileToken) {
      return transportFailure(contactInfo, selectedIds, "Please complete the CAPTCHA.");
    }
    const { ok, networkError } = await verifyTurnstile(turnstileToken);
    if (!ok) {
      return transportFailure(
        contactInfo,
        selectedIds,
        networkError ? TRANSPORT_ERROR_CAPTCHA_NETWORK : "Please complete the CAPTCHA.",
      );
    }
  }

  const productSlug = formData.get("productSlug");
  const endpoint = `${optionalEnv("WIX_VELO_SITE_URL")}/_functions/sampleRequests`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        swatchIds: selectedIds,
        contactInfo,
        productSlug: typeof productSlug === "string" ? productSlug : undefined,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    const errorId = captureWithId(err, "submitSwatchRequestAction:fetch");
    console.error("[swatch-request] fetch to Velo failed:", errorId, err);
    return transportFailure(contactInfo, selectedIds, TRANSPORT_ERROR_GENERIC);
  }

  if (res.ok) {
    return { status: "success" };
  }

  if (res.status === 429) {
    return transportFailure(contactInfo, selectedIds, TRANSPORT_ERROR_RATE_LIMIT);
  }

  // Never echo raw Velo error strings to the user — Velo may return internal
  // detail that is not safe for user display. Log + capture for ops and always
  // return the generic copy.
  let veloErrorForLog: string | undefined;
  try {
    const body = (await res.json()) as VeloResponse;
    if (body && typeof body.error === "string") {
      veloErrorForLog = body.error.slice(0, 500);
    }
  } catch (parseErr) {
    const errorId = captureWithId(parseErr, "submitSwatchRequestAction:parseVeloError");
    console.error("[swatch-request] failed to parse Velo error body:", errorId, parseErr);
  }
  const errorId = captureWithId(
    new Error(`Velo ${res.status}: ${veloErrorForLog ?? "(no body)"}`),
    "submitSwatchRequestAction:veloRejected",
  );
  console.error(
    "[swatch-request] Velo endpoint rejected submission:",
    errorId,
    res.status,
    veloErrorForLog,
  );
  return transportFailure(contactInfo, selectedIds, TRANSPORT_ERROR_GENERIC);
}
