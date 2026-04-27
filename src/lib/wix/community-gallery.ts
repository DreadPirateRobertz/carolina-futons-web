import "server-only";

import { listCollectionItems, type WixDataItem } from "@/lib/wix/data";
import { isWixSdkError, logWixFailure } from "@/lib/wix/errors";

export type CommunityPhoto = {
  _id: string;
  image: string;
  customerName: string;
  location: string;
  productSlug: string;
  caption: string;
};

export type GalleryResult = {
  photos: CommunityPhoto[];
  error?: "wix_sdk" | "unexpected";
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toPhoto(raw: WixDataItem): CommunityPhoto | null {
  const image = raw.image;
  // Require absolute HTTPS URLs. Wix Media Manager uses wix:image:// scheme
  // until images are processed to CDN URLs; those must be resolved before
  // storing in the collection. Items with non-HTTPS images are silently
  // dropped here rather than surfaced as errors so a bad row never breaks the grid.
  if (!raw._id || typeof image !== "string" || !image.startsWith("https://")) {
    return null;
  }
  return {
    _id: raw._id,
    image,
    customerName: asString(raw.customerName),
    location: asString(raw.location),
    productSlug: asString(raw.productSlug),
    caption: asString(raw.caption),
  };
}

export async function listCommunityPhotos(limit = 60): Promise<GalleryResult> {
  try {
    const items = await listCollectionItems("CommunityPhotos", limit);
    const photos = items
      .map(toPhoto)
      .filter((photo): photo is CommunityPhoto => photo !== null);

    const dropped = items.length - photos.length;
    if (dropped > 0) {
      const sampleIds = items
        .filter((item) => !toPhoto(item))
        .map((item) => item._id ?? "(no _id)")
        .slice(0, 5);
      console.warn(
        `[wix] listCommunityPhotos: dropped ${dropped}/${items.length} items (missing _id or non-HTTPS image). Sample IDs: ${sampleIds.join(", ")}`,
      );
    }

    return { photos };
  } catch (err) {
    await logWixFailure("wix", "listCommunityPhotos", err);
    // Let programmer bugs propagate to the Next.js error boundary; only
    // Wix SDK errors (network/outage) are safe to absorb and return empty.
    if (!isWixSdkError(err)) throw err;
    return { photos: [], error: "wix_sdk" };
  }
}
