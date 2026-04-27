import { callVelo, VeloRpcError } from "@/lib/wix/velo-client";

export type TrackCustomEventParams = {
  source?: string;
  memberId?: string;
  [key: string]: unknown;
};

export type TrackCustomEventResult = { success: boolean };

// Wrapper around the trackCustomEvent HTTP function (POST /_functions/trackCustomEvent).
// Writes to the AnalyticsEvents CMS collection. Used by marketing landings
// to log UTM-tagged visits without blocking page render.
// NOTE: webMethod "customEvents/trackCustomEvent" (customEvents.web.js) is unreachable
// from the Next.js host (different runtime); the HTTP function is the callable entry point.
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
    if (err instanceof VeloRpcError) {
      console.error(
        `[customEvents] trackCustomEvent("${eventName}") rpc failed: HTTP ${err.status}`,
      );
    } else {
      console.error(
        `[customEvents] trackCustomEvent("${eventName}") failed:`,
        err,
      );
    }
    return { success: false };
  }
}
