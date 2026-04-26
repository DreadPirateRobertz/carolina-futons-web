// Wire types for /api/delivery-zone. Shared between the route handler
// (`src/app/api/delivery-zone/route.ts`) and the client consumers
// (`PdpWhiteGlove`, future cart-page rate preview, etc.) so the contract
// can't drift from one side to the other.
//
// Mirrors the route's response shape exactly; the component used to
// duplicate this inline as `"white-glove" | "ltl" | "unsupported"` and
// would silently break narrowing the moment a new variant landed in
// `ShippingService` upstream.

import type {
  EstDays,
  ShippingService,
  ShippingZone,
} from "@/lib/product/shipping-estimate";

export type DeliveryZoneOk = {
  ok: true;
  zip: string;
  zone: ShippingZone;
  eligible: boolean;
  service: ShippingService;
  estDays: EstDays;
  label: string;
};

export type DeliveryZoneError = {
  ok: false;
  error: "missing-zip" | "invalid-zip" | "invalid-json";
};

export type DeliveryZoneResponse = DeliveryZoneOk | DeliveryZoneError;
