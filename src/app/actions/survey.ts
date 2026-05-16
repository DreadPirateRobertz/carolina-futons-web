"use server";

import { logError } from "@/lib/logging/log-error";
import type { SurveyActionState } from "@/app/survey/survey-state";

const FETCH_TIMEOUT_MS = 8_000;
const GENERIC_ERROR = "Couldn't save your response — please try again shortly.";

export async function submitSurvey(
  _prev: SurveyActionState,
  formData: FormData,
): Promise<SurveyActionState> {
  const score = parseInt(formData.get("score") as string, 10);
  const comments = ((formData.get("comments") as string) ?? "").trim();
  const orderId = ((formData.get("orderId") as string) ?? "").trim();

  if (!Number.isInteger(score) || score < 0 || score > 10) {
    return { status: "error", error: "Please choose a score from 0 to 10." };
  }

  const base = process.env.WIX_VELO_SITE_URL;
  if (!base) {
    // cfw-1r9n: parallel to cfw-hd8t notify-me — three distinct ops
    // (config / veloResponse / fetch) so a missing env var, a sustained
    // Velo HTTP failure, and a network storm get separate Sentry groups
    // even though they all surface the same user-visible generic error.
    await logError(
      "survey",
      "config",
      new Error("WIX_VELO_SITE_URL not set"),
    );
    return { status: "error", error: GENERIC_ERROR };
  }

  try {
    const res = await fetch(
      `${base.replace(/\/$/, "")}/_functions/submitSurvey`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ score, comments, orderId }),
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    if (!res.ok) {
      await logError(
        "survey",
        "veloResponse",
        new Error(`Velo responded HTTP ${res.status}`),
        { httpStatus: res.status },
      );
      return { status: "error", error: GENERIC_ERROR };
    }
    return { status: "success" };
  } catch (err) {
    await logError("survey", "fetch", err);
    return { status: "error", error: GENERIC_ERROR };
  }
}
