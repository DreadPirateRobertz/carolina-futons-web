import "server-only";

import { getWixClient } from "@/lib/wix-client";
import { queryCollectionWhere, type WixDataItem } from "@/lib/wix/data";
import type { QaItem } from "@/lib/qa/qa-schema";

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
  const rows = await queryCollectionWhere<RawQaItem>(
    COLLECTION,
    "productSlug",
    productSlug,
    50,
  );
  return rows.map(toQaItem).sort((a, b) => b.helpfulCount - a.helpfulCount);
}

export async function insertProductQuestion(args: {
  productSlug: string;
  question: string;
  askedBy: string;
  askedAt: string;
}): Promise<void> {
  const client = getWixClient();
  await client.items.save(COLLECTION, {
    productSlug: args.productSlug,
    question: args.question,
    askedBy: args.askedBy,
    askedAt: args.askedAt,
    helpfulCount: 0,
    status: "pending",
  } as Parameters<typeof client.items.save>[1]);
}
