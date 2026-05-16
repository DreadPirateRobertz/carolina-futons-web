import { queryCollectionWhere } from "@/lib/wix/data";
import { logWixFailure } from "@/lib/wix/errors";

export type {
  DimensionSet,
  ProductDimensions,
  CareGuide,
  RoomFitVerdict,
  RoomFitResult,
} from "@/lib/product/size-guide-shared";
export { convertDimensions, checkRoomFit } from "@/lib/product/size-guide-shared";

import type { ProductDimensions, CareGuide } from "@/lib/product/size-guide-shared";

type RawDimensionRow = {
  productId: string;
  closedWidth?: number;
  closedDepth?: number;
  closedHeight?: number;
  openWidth?: number;
  openDepth?: number;
  openHeight?: number;
  seatHeight?: number;
  weight?: number;
  mattressSize?: string;
  shippingWidth?: number;
  shippingDepth?: number;
  shippingHeight?: number;
  shippingWeight?: number;
};

type RawCareRow = {
  productId: string;
  material?: string;
  cleaningMethod?: string;
  maintenanceTips?: string;
  warningNotes?: string;
};

const VALID_MATERIALS = ["fabric", "wood", "metal", "leather"] as const;

function toNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export async function getProductDimensions(
  productId: string,
): Promise<ProductDimensions | null> {
  try {
    const rows = await queryCollectionWhere<RawDimensionRow>(
      "ProductDimensions",
      "productId",
      productId,
      1,
    );
    if (!rows.length) return null;
    const d = rows[0];
    const hasShipping =
      d.shippingWidth != null || d.shippingDepth != null || d.shippingHeight != null;
    return {
      productId: d.productId,
      unit: "in",
      closed: {
        width: toNum(d.closedWidth),
        depth: toNum(d.closedDepth),
        height: toNum(d.closedHeight),
      },
      open: {
        width: toNum(d.openWidth),
        depth: toNum(d.openDepth),
        height: toNum(d.openHeight),
      },
      seatHeight: toNum(d.seatHeight) ?? null,
      weight: toNum(d.weight) ?? null,
      mattressSize: d.mattressSize ?? null,
      shipping: hasShipping
        ? {
            width: toNum(d.shippingWidth),
            depth: toNum(d.shippingDepth),
            height: toNum(d.shippingHeight),
            weight: toNum(d.shippingWeight),
          }
        : null,
    };
  } catch (err) {
    await logWixFailure("size-guide", `getProductDimensions(${productId})`, err);
    return null;
  }
}

export async function getCareGuide(slug: string): Promise<CareGuide | null> {
  try {
    const rows = await queryCollectionWhere<RawCareRow>(
      "FurnitureCare",
      "productId",
      slug,
      1,
    );
    if (!rows.length) return null;
    const r = rows[0];
    const raw = typeof r.material === "string" ? r.material.toLowerCase().trim() : "";
    const material: CareGuide["material"] = (
      VALID_MATERIALS as ReadonlyArray<string>
    ).includes(raw)
      ? (raw as CareGuide["material"])
      : "unknown";
    return {
      material,
      cleaningMethod: r.cleaningMethod ?? "",
      maintenanceTips: r.maintenanceTips ?? "",
      warningNotes: r.warningNotes ?? "",
    };
  } catch (err) {
    await logWixFailure("size-guide", `getCareGuide(${slug})`, err);
    return null;
  }
}
