"use server";

import { optionalEnv } from "@/lib/env";

export type SubmitPhotoState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function veloBase(): string {
  return optionalEnv("WIX_VELO_SITE_URL").replace(/\/$/, "");
}

export async function submitCommunityPhoto(
  _prev: SubmitPhotoState,
  formData: FormData,
): Promise<SubmitPhotoState> {
  const imageUrl = (formData.get("imageUrl") as string | null)?.trim() ?? "";
  const customerName = (formData.get("customerName") as string | null)?.trim() ?? "";
  const location = (formData.get("location") as string | null)?.trim() ?? "";
  const caption = (formData.get("caption") as string | null)?.trim() ?? "";
  const productSlug = (formData.get("productSlug") as string | null)?.trim() ?? "";

  if (!imageUrl || !customerName) {
    return { status: "error", message: "Name and photo URL are required." };
  }

  try {
    const res = await fetch(`${veloBase()}/_functions/submitCommunityPhoto`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl, customerName, location, caption, productSlug }),
      cache: "no-store",
    });

    const json = (await res.json()) as { success: boolean; error?: string };
    if (!json.success) {
      return { status: "error", message: json.error ?? "Submission failed. Please try again." };
    }
    return {
      status: "success",
      message: "Thanks! Your photo has been submitted for review. We'll add it to the gallery soon.",
    };
  } catch {
    return { status: "error", message: "Network error — please check your connection and try again." };
  }
}
