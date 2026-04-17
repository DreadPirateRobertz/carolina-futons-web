import { getWixClient } from "@/lib/wix-client";

export type WixDataItem = Record<string, unknown> & {
  _id?: string;
  _createdDate?: string;
  _updatedDate?: string;
};

export async function listCollectionItems<T extends WixDataItem = WixDataItem>(
  collectionId: string,
  limit = 50,
): Promise<T[]> {
  const client = getWixClient();
  const result = await client.items.query(collectionId).limit(limit).find();
  return result.items as T[];
}

export async function getCollectionItemById<T extends WixDataItem = WixDataItem>(
  collectionId: string,
  id: string,
): Promise<T | null> {
  const client = getWixClient();
  const result = await client.items
    .query(collectionId)
    .eq("_id", id)
    .limit(1)
    .find();
  return (result.items[0] as T | undefined) ?? null;
}
