"use server";

import { withMember } from "@/lib/auth/member";
import { callVelo } from "@/lib/wix/velo-client";

export type MemberPerk = {
  tierKey: string;
  tierName: string;
  perkId: string;
  label: string;
  description: string;
  icon: string;
};

export type MemberPerksResult =
  | {
      success: true;
      currentTierName: string;
      currentTierKey: string;
      totalPoints: number;
      unlockedPerks: MemberPerk[];
      nextTierName: string | null;
      nextTierKey: string | null;
      nextTierPointsNeeded: number | null;
      nextTierPerks: Pick<MemberPerk, "perkId" | "label" | "description" | "icon">[] | null;
    }
  | { success: false; error: string };

export async function getMemberPerks(): Promise<MemberPerksResult> {
  return withMember((m) =>
    callVelo<MemberPerksResult>({
      method: "rewardEngine/getMemberDeliveredPerks",
      args: [],
      accessToken: m.accessToken,
    }),
  );
}
