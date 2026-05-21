import "server-only";

import { unstable_cache } from "next/cache";

import { logError } from "@/lib/observability/log";
import { QA_INSERT_FAILED, QA_LIST_FAILED } from "@/lib/observability/errorIds";
import { getWixClient } from "@/lib/wix-client";
import { queryCollectionWhere, type WixDataItem } from "@/lib/wix/data";
import type { QaItem } from "@/lib/qa/qa-schema";

export const PRODUCT_QA_CACHE_TAG = "product-qa";

// Returns the full revalidateTag set for a product's Q&A cache:
//   [slug-specific tag, global product-qa tag]
// Centralised here so qa-actions.ts + api/product-qa/route.ts stay in sync.
export function getQaCacheTags(productSlug: string): [string, string] {
  return [`product-qa:${productSlug}`, PRODUCT_QA_CACHE_TAG];
}

const COLLECTION = "ProductQandA";

type RawQaItem = WixDataItem & {
  productSlug: string;
  question: string;
  askedBy: string;
  askedAt: string;
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  helpfulCount?: number;
  status?: string;
};

function toQaItem(raw: RawQaItem): QaItem {
  return {
    _id: raw._id ?? "",
    productSlug: raw.productSlug,
    question: raw.question,
    askedBy: raw.askedBy,
    askedAt: raw.askedAt,
    answer: raw.answer,
    answeredBy: raw.answeredBy,
    answeredAt: raw.answeredAt,
    helpfulCount: raw.helpfulCount ?? 0,
    status: (raw.status as QaItem["status"]) ?? "pending",
  };
}

export async function listProductQa(productSlug: string): Promise<QaItem[]> {
  const cached = unstable_cache(
    async () => {
      try {
        const rows = await queryCollectionWhere<RawQaItem>(
          COLLECTION,
          "productSlug",
          productSlug,
          50,
        );
        return rows.map(toQaItem).sort((a, b) => b.helpfulCount - a.helpfulCount);
      } catch (err) {
        logError("product-qa", QA_LIST_FAILED, err);
        throw err;
      }
    },
    [`product-qa:${productSlug}-v1`], // -v1 suffix: cache busting if QaItem shape changes
    { revalidate: 300, tags: getQaCacheTags(productSlug) },
  );
  return cached();
}

export async function insertProductQuestion(args: {
  productSlug: string;
  question: string;
  askedBy: string;
  askedAt: string;
}): Promise<void> {
  const client = getWixClient();
  try {
    await client.items.save(COLLECTION, {
      productSlug: args.productSlug,
      question: args.question,
      askedBy: args.askedBy,
      askedAt: args.askedAt,
      helpfulCount: 0,
      status: "pending",
    } as Parameters<typeof client.items.save>[1]);
  } catch (err) {
    logError("product-qa", QA_INSERT_FAILED, err);
    throw err;
  }
}
