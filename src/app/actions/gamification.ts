"use server";

import { withMember } from "@/lib/auth/member";
import { callVelo } from "@/lib/wix/velo-client";

const g = (method: string) => `gamificationCore/${method}`;

// gamificationCore methods accept memberId as the first positional arg rather
// than inferring from the bearer token. We derive memberId server-side from the
// session and pass it explicitly so callers can't spoof another member's id.
export async function getActiveChallenges() {
  return withMember((s) =>
    callVelo({
      method: g("getActiveChallenges"),
      args: [s.memberId],
      accessToken: s.accessToken,
    }),
  );
}
export async function getStreakData() {
  return withMember((s) =>
    callVelo({
      method: g("getStreakData"),
      args: [s.memberId],
      accessToken: s.accessToken,
    }),
  );
}
export async function getMemberTier() {
  return withMember((s) =>
    callVelo({
      method: g("getMemberTier"),
      args: [s.memberId],
      accessToken: s.accessToken,
    }),
  );
}
export async function getActivityFeed(limit = 20) {
  return withMember((s) =>
    callVelo({
      method: g("getActivityFeed"),
      args: [s.memberId, limit],
      accessToken: s.accessToken,
    }),
  );
}

export async function recordChallengeProgress(challengeId: string) {
  return withMember((s) =>
    callVelo({
      method: g("recordChallengeProgress"),
      args: [{ memberId: s.memberId, challengeId }],
      accessToken: s.accessToken,
    }),
  );
}
export async function recoverStreak() {
  return withMember((s) =>
    callVelo({
      method: g("recoverStreak"),
      args: [s.memberId],
      accessToken: s.accessToken,
    }),
  );
}
export async function receiveGamificationEvent(eventName: string, payload: unknown) {
  return withMember((s) =>
    callVelo({
      method: g("receiveGamificationEvent"),
      args: [eventName, payload, s.memberId],
      accessToken: s.accessToken,
    }),
  );
}

// `gamificationCore.getLeaderboard` is Permissions.Anyone — public homepage
// widget surface. Do NOT wrap with withMember (that would force /login for
// logged-out visitors). A logged-in caller may pass their memberId to get a
// highlight row; logged-out callers get the board without a highlight.
export async function getLeaderboardPublic(
  limit = 10,
  memberId: string | null = null,
) {
  return callVelo({
    method: g("getLeaderboard"),
    args: [limit, memberId],
  });
}
