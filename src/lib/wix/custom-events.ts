import { callVelo, VeloRpcError } from "@/lib/wix/velo-client";
import { logError } from "@/lib/logging/log-error";

export type TrackCustomEventParams = {
  source?: string;
  memberId?: string;
  [key: string]: unknown;
};

export type TrackCustomEventResult = { success: boolean };

// Wrapper around the Wix HTTP function post_trackCustomEvent (http-functions.js).
// Invoked via callVelo, which routes to /_functions/trackCustomEvent on the Velo backend.
//
// Why not the webMethod customEvents/trackCustomEvent (customEvents.web.js)?
// Wix webMethods are a Velo-only IPC protocol — they cannot be called over HTTP from
// an external host. Only http-functions.js exports are reachable via /_functions/ from
// outside the Wix runtime. (cf-gnli lesson)
export async function trackCustomEvent(
  eventName: string,
  params: TrackCustomEventParams = {},
): Promise<TrackCustomEventResult> {
  try {
    return await callVelo<TrackCustomEventResult>({
      method: "trackCustomEvent",
      args: [eventName, params],
    });
  } catch (err) {
    // cfw-vuqd: same shape as cfw-6ngi captureQuizLead — collapses the
    // VeloRpcError vs unexpected branches into one logError with the
    // discriminator in extras. eventName always present so Sentry can
    // group per-event (e.g. only badge_earned failing).
    const httpStatus = err instanceof VeloRpcError ? err.status : undefined;
    await logError("customEvents", "trackCustomEvent", err, {
      eventName,
      httpStatus,
    });
    return { success: false };
  }
}
