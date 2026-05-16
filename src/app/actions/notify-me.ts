"use server";

import { logError } from "@/lib/logging/log-error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FETCH_TIMEOUT_MS = 8_000;
const GENERIC_ERROR = "Could not save — please try again shortly.";

export type NotifyMeState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "success" }
  | { status: "error"; error: string };

export async function submitNotifyMe(
  _prev: NotifyMeState,
  formData: FormData,
): Promise<NotifyMeState> {
  const email = (formData.get("email") as string ?? "").trim().toLowerCase();
  const productId = (formData.get("productId") as string ?? "").trim();

  if (!email) return { status: "error", error: "Email address is required." };
  if (!EMAIL_RE.test(email))
    return { status: "error", error: "That email doesn't look right." };
  if (!productId) return { status: "error", error: "Product ID is required." };

  const base = process.env.WIX_VELO_SITE_URL;
  if (!base) {
    // cfw-hd8t: misconfig case ships as a real Error so Sentry has a
    // stack to fingerprint on; otherwise multiple unrelated misconfigs
    // would collapse into the same generic event group.
    await logError(
      "notify-me",
      "config",
      new Error("WIX_VELO_SITE_URL not set"),
    );
    return { status: "error", error: GENERIC_ERROR };
  }

  try {
    const res = await fetch(
      `${base.replace(/\/$/, "")}/_functions/notifyMe`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, productId }),
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    if (!res.ok) {
      // cfw-hd8t: HTTP non-ok ships with the status in extras so Sentry
      // groups by-status (a sustained 5xx from Velo is a different
      // incident than sporadic 429s).
      await logError(
        "notify-me",
        "veloResponse",
        new Error(`Velo responded HTTP ${res.status}`),
        { httpStatus: res.status },
      );
      return { status: "error", error: GENERIC_ERROR };
    }
    return { status: "success" };
  } catch (err) {
    // cfw-hd8t: fetch throw — network failure, AbortSignal timeout, etc.
    await logError("notify-me", "fetch", err);
    return { status: "error", error: GENERIC_ERROR };
  }
}
