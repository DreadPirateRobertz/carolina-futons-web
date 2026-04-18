"use server";

import { withMember } from "@/lib/auth/member";
import { callVelo } from "@/lib/wix/velo-client";

const m = (method: string) => `loyaltyService/${method}`;

export async function getMyLoyaltyAccount() {
  return withMember((s) =>
    callVelo({ method: m("getMyLoyaltyAccount"), args: [], accessToken: s.accessToken }),
  );
}
export async function getAvailableRewards() {
  return withMember((s) =>
    callVelo({ method: m("getAvailableRewards"), args: [], accessToken: s.accessToken }),
  );
}
export async function getMyStreakData() {
  return withMember((s) =>
    callVelo({ method: m("getMyStreakData"), args: [], accessToken: s.accessToken }),
  );
}
export async function getMyDailyQuests() {
  return withMember((s) =>
    callVelo({ method: m("getMyDailyQuests"), args: [], accessToken: s.accessToken }),
  );
}
export async function getMyAchievements() {
  return withMember((s) =>
    callVelo({ method: m("getMyAchievements"), args: [], accessToken: s.accessToken }),
  );
}
export async function getMyActivity(limit = 20) {
  return withMember((s) =>
    callVelo({ method: m("getMyActivity"), args: [limit], accessToken: s.accessToken }),
  );
}
export async function getMyBurnRate() {
  return withMember((s) =>
    callVelo({ method: m("getMyBurnRate"), args: [], accessToken: s.accessToken }),
  );
}
export async function getLoyaltyTiers() {
  return withMember((s) =>
    callVelo({ method: m("getLoyaltyTiers"), args: [], accessToken: s.accessToken }),
  );
}
export async function getLeaderboard(limit = 10) {
  return withMember((s) =>
    callVelo({ method: m("getLeaderboard"), args: [limit], accessToken: s.accessToken }),
  );
}
export async function getChallengeCatalog() {
  return withMember((s) =>
    callVelo({ method: m("getChallengeCatalog"), args: [], accessToken: s.accessToken }),
  );
}
export async function getChallengeLeaderboard(challengeId: string) {
  return withMember((s) =>
    callVelo({
      method: m("getChallengeLeaderboard"),
      args: [challengeId],
      accessToken: s.accessToken,
    }),
  );
}

// `redeemReward` exists in two backend modules. We target `loyaltyService` here —
// it wraps the Wix Loyalty API and auto-creates a coupon. `rewardsStore.redeemReward`
// is a lower-level CMS-backed variant that takes memberId explicitly and is not
// exposed from this action surface.
export async function redeemReward(rewardId: string) {
  return withMember((s) =>
    callVelo({
      method: m("redeemReward"),
      args: [rewardId],
      accessToken: s.accessToken,
    }),
  );
}
