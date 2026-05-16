"use server";

import { logError } from "@/lib/observability/log";

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
    await logError("notify-me", "WIX_VELO_SITE_URL not set");
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
      await logError("notify-me", "Velo responded", undefined, {
        status: res.status,
      });
      return { status: "error", error: GENERIC_ERROR };
    }
    return { status: "success" };
  } catch (err) {
    await logError("notify-me", "fetch failed", err);
    return { status: "error", error: GENERIC_ERROR };
  }
}
