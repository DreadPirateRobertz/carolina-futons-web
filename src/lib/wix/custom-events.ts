import { callVelo, VeloRpcError } from "@/lib/wix/velo-client";

export type TrackCustomEventParams = {
  source?: string;
  memberId?: string;
  [key: string]: unknown;
};

export type TrackCustomEventResult = { success: boolean };

// Wrapper around the customEvents/trackCustomEvent webMethod (Permissions.Anyone)
// that writes to the AnalyticsEvents CMS collection. Used by marketing landings
// to log UTM-tagged visits without blocking page render.
export async function trackCustomEvent(
  eventName: string,
  params: TrackCustomEventParams = {},
): Promise<TrackCustomEventResult> {
  try {
    return await callVelo<TrackCustomEventResult>({
      method: "customEvents/trackCustomEvent",
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
