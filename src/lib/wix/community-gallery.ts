import { listCollectionItems, type WixDataItem } from "@/lib/wix/data";
import { logWixFailure } from "@/lib/wix/errors";

export type CommunityPhoto = {
  _id: string;
  image: string;
  customerName: string;
  location: string;
  productSlug: string;
  caption: string;
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function toPhoto(raw: WixDataItem): CommunityPhoto | null {
  const id = raw._id;
  const image = raw.image;
  if (!id || typeof image !== "string" || !image.startsWith("https://")) return null;
  return {
    _id: id,
    image,
    customerName: str(raw.customerName),
    location: str(raw.location),
    productSlug: str(raw.productSlug),
    caption: str(raw.caption),
  };
}

export async function listCommunityPhotos(limit = 60): Promise<CommunityPhoto[]> {
  try {
    const items = await listCollectionItems("CommunityPhotos", limit);
    return items.flatMap((item) => {
      const photo = toPhoto(item);
      return photo ? [photo] : [];
    });
  } catch (err) {
    logWixFailure("wix", "listCommunityPhotos", err);
    return [];
  }
}
