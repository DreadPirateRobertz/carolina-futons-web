"use server";

import { logError } from "@/lib/observability/log";
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
    logError("survey", "WIX_VELO_SITE_URL not set");
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
      logError("survey", "Velo responded with non-2xx", res.status);
      return { status: "error", error: GENERIC_ERROR };
    }
    return { status: "success" };
  } catch (err) {
    logError("survey", "fetch failed", err);
    return { status: "error", error: GENERIC_ERROR };
  }
}
