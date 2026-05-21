"use server";

import { revalidateTag } from "next/cache";

import { logError } from "@/lib/observability/log";
import { QA_REVALIDATE_FAILED } from "@/lib/observability/errorIds";
import {
  coerceQaInput,
  hasQaErrors,
  maskName,
  validateQaInput,
} from "@/lib/qa/qa-schema";
import { insertProductQuestion, PRODUCT_QA_CACHE_TAG } from "@/lib/wix/product-qa";
import type { QaActionState } from "@/components/product/qa-state";

const TRANSPORT_ERROR = "We couldn't save that — please try again.";

export async function submitQuestion(
  productSlug: string,
  _prev: QaActionState,
  formData: FormData,
): Promise<QaActionState> {
  const raw = Object.fromEntries(formData.entries());
  const input = coerceQaInput(raw, productSlug);
  const errors = validateQaInput(input);

  if (hasQaErrors(errors)) {
    return {
      status: "error",
      errors,
      values: { question: input.question, name: input.name },
    };
  }

  try {
    await insertProductQuestion({
      productSlug,
      question: input.question,
      askedBy: maskName(input.name),
      askedAt: new Date().toISOString(),
    });
  } catch {
    // insertProductQuestion already logged via QA_INSERT_FAILED in product-qa.ts.
    return {
      status: "error",
      errors: {},
      values: { question: input.question, name: input.name },
      transportError: TRANSPORT_ERROR,
    };
  }

  try {
    // Invalidate slug-specific cache first, then the generic tag so bulk
    // admin invalidation via PRODUCT_QA_CACHE_TAG is also exercised.
    revalidateTag(`product-qa:${productSlug}`);
    revalidateTag(PRODUCT_QA_CACHE_TAG);
  } catch (err) {
    logError("product-qa", QA_REVALIDATE_FAILED, err);
  }
  return { status: "success" };
}
