import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { logError } from "@/lib/observability/log";
import {
  coerceQaInput,
  hasQaErrors,
  maskName,
  validateQaInput,
} from "@/lib/qa/qa-schema";
import { insertProductQuestion, PRODUCT_QA_CACHE_TAG } from "@/lib/wix/product-qa";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const obj = (body ?? {}) as Record<string, unknown>;
  const productSlug =
    typeof obj.productSlug === "string" ? obj.productSlug.trim() : "";
  if (!productSlug) {
    return NextResponse.json(
      { error: "productSlug is required" },
      { status: 400 },
    );
  }

  const input = coerceQaInput(obj, productSlug);
  const errors = validateQaInput(input);
  if (hasQaErrors(errors)) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  try {
    await insertProductQuestion({
      productSlug,
      question: input.question,
      askedBy: maskName(input.name),
      askedAt: new Date().toISOString(),
    });
  } catch (err) {
    logError("api/product-qa", "insertProductQuestion failed", err);
    return NextResponse.json(
      { error: "Failed to save question" },
      { status: 500 },
    );
  }

  try {
    revalidateTag(`product-qa:${productSlug}`, "default");
  } catch (err) {
    logError("api/product-qa", "revalidateTag failed", err);
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
