"use server";

import {
  inferStateFromZip,
  isValidZip,
  matchLocalZone,
  type LocalZone,
} from "@/lib/delivery/local-zones";

// cf-3qt.4.4: Server Action for the /getting-it-home address-check form.
// Returns a structured result the client component renders without further
// business logic. Failure modes are surfaced as `{ ok: false, reason }` so
// the UI never has to differentiate "Wix down" from "ZIP outside coverage".

export type DeliveryZoneResult =
  | {
      ok: true;
      zone: LocalZone;
    }
  | {
      ok: false;
      reason: "invalid-zip" | "out-of-area";
      zip: string;
    };

export async function resolveDeliveryZone(
  formData: FormData,
): Promise<DeliveryZoneResult> {
  const rawZip = String(formData.get("zip") ?? "").trim();
  const rawState = String(formData.get("state") ?? "").trim();

  if (!isValidZip(rawZip)) {
    return { ok: false, reason: "invalid-zip", zip: rawZip };
  }

  const state = rawState || inferStateFromZip(rawZip) || undefined;
  const zone = matchLocalZone(rawZip, state);
  if (!zone) {
    return { ok: false, reason: "out-of-area", zip: rawZip };
  }
  return { ok: true, zone };
}
