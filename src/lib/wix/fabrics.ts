import "server-only";

import { listCollectionItems } from "@/lib/wix/data";
import type { SwatchItem } from "@/lib/swatch-request/swatch-request-schema";

export async function listFabricSwatches(): Promise<SwatchItem[]> {
  const items = await listCollectionItems<SwatchItem & { sortOrder?: number }>(
    "FabricSwatches",
    200,
  );
  return items
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(({ _id, swatchName, colorFamily, colorHex }) => ({
      _id: _id ?? "",
      swatchName: swatchName ?? "",
      colorFamily,
      colorHex,
    }));
}
