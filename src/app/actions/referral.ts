"use server";

import { getMemberSession, withMember } from "@/lib/auth/member";
import { callVelo } from "@/lib/wix/velo-client";
import { logError } from "@/lib/log";

const r = (method: string) => `referralService/${method}`;

export type ReferralStats = {
  totalReferrals: number;
  pendingRewards: number;
  earnedRewards: number;
};

export type PublicReferral = {
  valid: boolean;
  referrerName?: string;
  discountPct: number;
};

export async function getMyReferralCodeAction(): Promise<
  { success: true; code: string } | { success: false; requiresAuth?: boolean; error?: string }
> {
  const session = await getMemberSession();
  if (!session) return { success: false, requiresAuth: true };
  try {
    const res = await callVelo<{ success: boolean; code?: string; error?: string }>({
      method: r("getMyReferralCode"),
      args: [],
      accessToken: session.accessToken,
    });
    if (!res.success || !res.code) {
      return { success: false, error: res.error ?? "Could not load referral code." };
    }
    return { success: true, code: res.code };
  } catch (err) {
    await logError("referral", "getMyReferralCodeAction", err);
    return { success: false, error: "Could not load referral code. Please try again." };
  }
}

export async function getMyReferralStatsAction(): Promise<
  { success: true; stats: ReferralStats } | { success: false; requiresAuth?: boolean; error?: string }
> {
  const session = await getMemberSession();
  if (!session) return { success: false, requiresAuth: true };
  try {
    const res = await callVelo<{ success: boolean; stats?: ReferralStats; error?: string }>({
      method: r("getMyReferralStats"),
      args: [],
      accessToken: session.accessToken,
    });
    if (!res.success || !res.stats) {
      return { success: false, error: res.error ?? "Could not load stats." };
    }
    return { success: true, stats: res.stats };
  } catch (err) {
    await logError("referral", "getMyReferralStatsAction", err);
    return { success: false, error: "Could not load stats. Please try again." };
  }
}

export async function getReferralByCodeAction(code: string): Promise<
  { success: true; referral: PublicReferral } | { success: false; error?: string }
> {
  try {
    const res = await callVelo<{ success: boolean; referral?: PublicReferral; error?: string }>({
      method: r("getReferralByCode"),
      args: [code],
    });
    if (!res.success || !res.referral) {
      return { success: false, error: res.error ?? "Referral link not found." };
    }
    return { success: true, referral: res.referral };
  } catch (err) {
    await logError("referral", "getReferralByCodeAction", err);
    return { success: false, error: "Could not validate referral link." };
  }
}

export async function claimReferralAction(
  code: string,
): Promise<{ success: boolean; requiresAuth?: boolean; error?: string }> {
  return withMember((m) =>
    callVelo<{ success: boolean; error?: string }>({
      method: r("claimReferral"),
      args: [code],
      accessToken: m.accessToken,
    }),
  ).catch(async (err) => {
    await logError("referral", "claimReferralAction", err);
    return { success: false, error: "Could not apply referral. Please try again." };
  });
}
