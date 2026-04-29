import { queryCollectionWhere } from "@/lib/wix/data";
import { logWixFailure } from "@/lib/wix/errors";

const CM_PER_INCH = 2.54;

export type DimensionSet = {
  width: number | null;
  depth: number | null;
  height: number | null;
};

export type ProductDimensions = {
  productId: string;
  unit: "in" | "cm";
  closed: DimensionSet;
  open: DimensionSet;
  seatHeight: number | null;
  weight: number | null;
  mattressSize: string | null;
  shipping: {
    width: number | null;
    depth: number | null;
    height: number | null;
    weight: number | null;
  } | null;
};

export type CareGuide = {
  material: "fabric" | "wood" | "metal" | "leather" | "unknown";
  cleaningMethod: string;
  maintenanceTips: string;
  warningNotes: string;
};

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

function convert(val: number | null, toUnit: "in" | "cm"): number | null {
  if (val === null) return null;
  // toUnit tells us the target; the caller only invokes this when conversion is needed.
  return toUnit === "cm"
    ? Math.round(val * CM_PER_INCH * 10) / 10  // in → cm
    : Math.round((val / CM_PER_INCH) * 10) / 10; // cm → in
}

export function convertDimensions(
  dims: ProductDimensions,
  unit: "in" | "cm",
): ProductDimensions {
  if (dims.unit === unit) return dims;
  const c = (v: number | null) => convert(v, unit);
  return {
    ...dims,
    unit,
    closed: { width: c(dims.closed.width), depth: c(dims.closed.depth), height: c(dims.closed.height) },
    open: { width: c(dims.open.width), depth: c(dims.open.depth), height: c(dims.open.height) },
    seatHeight: c(dims.seatHeight),
    shipping: dims.shipping
      ? { ...dims.shipping, width: c(dims.shipping.width), depth: c(dims.shipping.depth), height: c(dims.shipping.height) }
      : null,
  };
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

export type RoomFitVerdict = "fits" | "tight" | "no-fit" | "unknown";

export type RoomFitResult = {
  verdict: RoomFitVerdict;
  message: string;
  openDepthIn: number | null;
  openWidthIn: number | null;
  roomWidthIn: number;
  roomDepthIn: number;
};

const CLEARANCE_MIN = 24; // inches — minimum recommended clearance per side
const TIGHT_THRESHOLD = 12; // inches — warn when clearance is less than this

export function checkRoomFit(
  dims: ProductDimensions,
  roomWidthIn: number,
  roomDepthIn: number,
): RoomFitResult {
  // Work in inches regardless of current unit
  const src = dims.unit === "cm" ? convertDimensions(dims, "in") : dims;
  const openW = src.open.width;
  const openD = src.open.depth;

  const base: Pick<RoomFitResult, "openDepthIn" | "openWidthIn" | "roomWidthIn" | "roomDepthIn"> = {
    openDepthIn: openD,
    openWidthIn: openW,
    roomWidthIn,
    roomDepthIn,
  };

  if (openW === null || openD === null) {
    return { ...base, verdict: "unknown", message: "Open-position dimensions not available for this product." };
  }

  const widthClearance = roomWidthIn - openW;
  const depthClearance = roomDepthIn - openD;

  if (widthClearance < 0 || depthClearance < 0) {
    return {
      ...base,
      verdict: "no-fit",
      message: `This product (${openW}" W × ${openD}" D open) is too large for a ${roomWidthIn}" × ${roomDepthIn}" room.`,
    };
  }

  const minClearance = Math.min(widthClearance, depthClearance);

  if (minClearance < CLEARANCE_MIN) {
    if (minClearance < TIGHT_THRESHOLD) {
      return {
        ...base,
        verdict: "tight",
        message: `Very tight fit — only ${minClearance}" of clearance. We recommend at least ${CLEARANCE_MIN}" on each side for comfortable use.`,
      };
    }
    return {
      ...base,
      verdict: "tight",
      message: `Fits with limited clearance (${minClearance}" on the tightest side). Measure carefully before ordering.`,
    };
  }

  return {
    ...base,
    verdict: "fits",
    message: `Good fit — ${openW}" W × ${openD}" D open, ${Math.min(widthClearance, depthClearance)}" clearance on the tightest side.`,
  };
}
