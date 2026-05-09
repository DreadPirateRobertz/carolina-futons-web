// Pure types and functions shared between server-side size-guide.ts and the
// client-side PdpSizeGuide component. No Wix/server imports here so this
// module is safe to import from "use client" components.

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

export type RoomFitVerdict = "fits" | "tight" | "no-fit" | "unknown";

export type RoomFitResult = {
  verdict: RoomFitVerdict;
  message: string;
  openDepthIn: number | null;
  openWidthIn: number | null;
  roomWidthIn: number;
  roomDepthIn: number;
};

function convert(val: number | null, toUnit: "in" | "cm"): number | null {
  if (val === null) return null;
  return toUnit === "cm"
    ? Math.round(val * CM_PER_INCH * 10) / 10
    : Math.round((val / CM_PER_INCH) * 10) / 10;
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

const CLEARANCE_MIN = 24;
const TIGHT_THRESHOLD = 12;

export function checkRoomFit(
  dims: ProductDimensions,
  roomWidthIn: number,
  roomDepthIn: number,
): RoomFitResult {
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
