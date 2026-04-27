"use server";

import { optionalEnv } from "@/lib/env";
import { listCollectionItems } from "@/lib/wix/data";
import {
  coerceSwatchContactInfo,
  hasSwatchContactErrors,
  validateSwatchContactInfo,
  validateSwatchIds,
  type SwatchItem,
} from "@/lib/swatch-request/swatch-request-schema";
import type { SwatchRequestActionState } from "@/app/swatch-request/swatch-request-state";

const TRANSPORT_ERROR_GENERIC =
  "We couldn't submit that — please try again in a moment.";
const TRANSPORT_ERROR_RATE_LIMIT =
  "We've received a few requests from this address — please try again in a few minutes.";
const VELO_ERROR_MAX_LEN = 200;
const FETCH_TIMEOUT_MS = 10_000;
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type VeloResponse = { success: boolean; requestId?: string; error?: string };

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // dev: skip when key not configured
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
      signal: AbortSignal.timeout(5_000),
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[swatch-request] Turnstile verify failed:", err);
    return false;
  }
}

export async function listSwatchesAction(): Promise<SwatchItem[]> {
  try {
    const items = await listCollectionItems<
      SwatchItem & { sortOrder?: number }
    >("FabricSwatches", 100);
    return items
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map(({ _id, swatchName, colorFamily, colorHex }) => ({
        _id: _id ?? "",
        swatchName: swatchName ?? "",
        colorFamily,
        colorHex,
      }));
  } catch (err) {
    console.error("[swatch-request] listSwatchesAction failed:", err);
    return [];
  }
}

export async function submitSwatchRequestAction(
  _prev: SwatchRequestActionState | null,
  formData: FormData,
): Promise<SwatchRequestActionState> {
  // Extract selected swatch IDs (multi-value field)
  const selectedIds = formData.getAll("swatchIds").map(String);

  const contactRaw: Record<string, unknown> = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address1: formData.get("address1"),
    address2: formData.get("address2"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
  };
  const contactInfo = coerceSwatchContactInfo(contactRaw);

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

  // Verify Turnstile CAPTCHA
  const turnstileToken = formData.get("cf-turnstile-response");
  if (typeof turnstileToken === "string" && turnstileToken) {
    const ok = await verifyTurnstile(turnstileToken);
    if (!ok) {
      return {
        status: "error",
        errors: {},
        transportError: "Please complete the CAPTCHA.",
        values: contactInfo,
        selectedIds,
      };
    }
  } else if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    // Site key configured but token missing — block submission
    return {
      status: "error",
      errors: {},
      transportError: "Please complete the CAPTCHA.",
      values: contactInfo,
      selectedIds,
    };
  }

  const productSlug = formData.get("productSlug");
  const endpoint = `${optionalEnv("WIX_VELO_SITE_URL")}/_functions/sampleRequests`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        swatchIds: selectedIds,
        contactInfo: {
          firstName: contactInfo.firstName,
          lastName: contactInfo.lastName,
          email: contactInfo.email,
          phone: contactInfo.phone,
          address1: contactInfo.address1,
          address2: contactInfo.address2,
          city: contactInfo.city,
          state: contactInfo.state,
          zip: contactInfo.zip,
        },
        productSlug: typeof productSlug === "string" ? productSlug : undefined,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    console.error("[swatch-request] fetch to Velo failed:", err);
    return {
      status: "error",
      errors: {},
      transportError: TRANSPORT_ERROR_GENERIC,
      values: contactInfo,
      selectedIds,
    };
  }

  if (res.ok) {
    return { status: "success" };
  }

  if (res.status === 429) {
    return {
      status: "error",
      errors: {},
      transportError: TRANSPORT_ERROR_RATE_LIMIT,
      values: contactInfo,
      selectedIds,
    };
  }

  let veloError: string | undefined;
  try {
    const body = (await res.json()) as VeloResponse;
    if (body && typeof body.error === "string") {
      veloError = body.error.slice(0, VELO_ERROR_MAX_LEN);
    }
  } catch (parseErr) {
    console.error("[swatch-request] failed to parse Velo error body:", parseErr);
  }
  console.error(
    "[swatch-request] Velo endpoint rejected submission:",
    res.status,
    veloError,
  );
  return {
    status: "error",
    errors: {},
    transportError: veloError ?? TRANSPORT_ERROR_GENERIC,
    values: contactInfo,
    selectedIds,
  };
}
