import "server-only";

import type { Tokens } from "@wix/sdk";

import { getWixClientWithTokens } from "@/lib/wix-client";

// cfw-6qd.7: server-side helper to swap a product's main image. Wraps the
// Wix Stores updateProduct call so the route doesn't have to know the
// shape of `media.mainMedia` — feed in `{ productId, imageUrl }` and the
// helper takes care of the nested update payload.
//
// Scope: main image only (`media.mainMedia.image.url`). Adding or
// rearranging the gallery items array is out of scope for the first
// slice — the EditableImage flow on the PDP only swaps the hero/
// thumbnail today, and the broader gallery management is its own bead.

export type ProductImageWriteResult =
  | { ok: true; productId: string; imageUrl: string }
  | { ok: false; reason: "wix_error"; status?: number };

export async function updateProductMainImage(
  tokens: Tokens,
  productId: string,
  imageUrl: string,
): Promise<ProductImageWriteResult> {
  const client = getWixClientWithTokens(tokens);
  try {
    await client.products.updateProduct(productId, {
      media: {
        mainMedia: {
          image: { url: imageUrl },
        },
      },
    } as unknown as Parameters<typeof client.products.updateProduct>[1]);
    return { ok: true, productId, imageUrl };
  } catch (err) {
    return { ok: false, reason: "wix_error", status: extractStatus(err) };
  }
}

function extractStatus(err: unknown): number | undefined {
  if (err && typeof err === "object") {
    const direct = (err as { status?: unknown }).status;
    if (typeof direct === "number") return direct;
    const responseStatus = (err as { response?: { status?: unknown } }).response
      ?.status;
    if (typeof responseStatus === "number") return responseStatus;
  }
  return undefined;
}
