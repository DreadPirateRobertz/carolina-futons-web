import { optionalEnv } from "@/lib/env";

export type DimSet = {
  width: number | null;
  depth: number | null;
  height: number | null;
};

export type ProductDimensions = {
  productId: string;
  unit: "in" | "cm";
  closed: DimSet;
  open: DimSet;
  shipping: (DimSet & { weight: number | null }) | null;
  weight: number | null;
  seatHeight: number | null;
  mattressSize: string | null;
};

export type RoomDims = {
  doorwayWidth?: number;
  doorwayHeight?: number;
  hallwayWidth?: number;
  roomWidth?: number;
  roomDepth?: number;
};

export type FitCheck = {
  check: "doorway" | "hallway" | "room";
  fits: boolean;
  tight: boolean;
  clearance?: number;
  clearanceWidth?: number;
  clearanceHeight?: number;
  clearanceDepth?: number;
};

export type RoomFitResult = {
  success: boolean;
  allFit?: boolean;
  anyTight?: boolean;
  checks?: FitCheck[];
  error?: string;
};

function veloBase(): string {
  return optionalEnv("WIX_VELO_SITE_URL").replace(/\/$/, "");
}

export async function getProductDimensions(
  productId: string,
  unit: "in" | "cm" = "in",
): Promise<ProductDimensions | null> {
  try {
    const url = `${veloBase()}/_functions/productDimensions?productId=${encodeURIComponent(productId)}&unit=${unit}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: ProductDimensions | null };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function checkRoomFit(
  productId: string,
  roomDims: RoomDims,
): Promise<RoomFitResult> {
  try {
    const res = await fetch(`${veloBase()}/_functions/checkRoomFit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, roomDims }),
      cache: "no-store",
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    return (await res.json()) as RoomFitResult;
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
