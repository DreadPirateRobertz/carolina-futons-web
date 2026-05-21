import { NextResponse, type NextRequest } from "next/server";

import { getOwnerSession } from "@/lib/auth/owner";
import { logWixFailure } from "@/lib/wix/errors";
import { updateProductMainImage } from "@/lib/wix/product-image-write";
import { invalidateImage } from "@/lib/admin/revalidate";

// cfw-6qd.7: server endpoint behind the PDP "swap product image" affordance.
// Owner-only; takes { productId, imageUrl } and updates the product's main
// image via the Wix Stores SDK. UI follow-up will add the pencil overlay
// over the gallery + a file picker; the upload pipe (Wix Media Manager)
// is its own follow-up because the headless app's @wix/media surface is
// limited (see cfw-6qd.8 release notes from opal).
//
// Why URL-only for now: every Wix-hosted media file already has a public
// URL we can persist directly into `media.mainMedia.image.url`. That's
// enough to demonstrate end-to-end the products.update path while the
// upload route is unblocked. Until then, Brenda can swap to an existing
// Wix-hosted image (or any reachable URL the storefront can render).

export const dynamic = "force-dynamic";

const MAX_URL_LENGTH = 2048;
const MAX_PRODUCT_ID_LENGTH = 64;

type Body = { productId?: unknown; imageUrl?: unknown };

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const owner = await getOwnerSession();
  if (!owner) {
    return NextResponse.json(
      { error: "Owner sign-in required." },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";

  if (!productId) return badRequest("Missing required field: productId.");
  if (productId.length > MAX_PRODUCT_ID_LENGTH) {
    return badRequest(`Field 'productId' exceeds ${MAX_PRODUCT_ID_LENGTH} chars.`);
  }
  if (!imageUrl) return badRequest("Missing required field: imageUrl.");
  if (imageUrl.length > MAX_URL_LENGTH) {
    return badRequest(`Field 'imageUrl' exceeds ${MAX_URL_LENGTH} chars.`);
  }
  // Refuse anything that obviously isn't a usable image source. Wix-hosted
  // URLs use `wix:image://` or `https://static.wixstatic.com/...`; both
  // pass this check, as do regular http(s) URLs.
  if (
    !/^(?:https?:|wix:)/i.test(imageUrl)
  ) {
    return badRequest("Field 'imageUrl' must be an http(s) or wix: URL.");
  }

  const result = await updateProductMainImage(owner.tokens, productId, imageUrl);
  if (!result.ok) {
    await logWixFailure("admin/product-image", "products.updateProduct", {
      status: result.status,
    });
    return NextResponse.json(
      { error: "Image update failed. Please try again." },
      { status: 502 },
    );
  }

  // Best-effort PDP cache bust. The PDP path uses the slug, not the
  // productId, so we revalidate the broader /products tree to cover both
  // the slug page and any listing surface that holds a stale image.
  invalidateImage(productId);

  return NextResponse.json({
    ok: true,
    productId: result.productId,
    imageUrl: result.imageUrl,
  });
}
