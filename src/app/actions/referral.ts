"use server";

import { getMemberSession, withMember } from "@/lib/auth/member";
import { logError } from "@/lib/logging/log-error";
import { callVelo } from "@/lib/wix/velo-client";

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
    await logError("referral", "getMyReferralCode", err);
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
    await logError("referral", "getMyReferralStats", err);
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
    // cfw-x2at: include the code in extras so a recurring failure on a
    // specific referral code (corrupt row, decommissioned referrer) is
    // groupable. The code itself isn't PII — it's a public, owner-
    // shareable identifier.
    await logError("referral", "getReferralByCode", err, { code });
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
    // cfw-x2at: same per-code grouping rationale as getReferralByCode.
    // The catch is on a .catch chain rather than a try/catch, so the
    // handler is async — logError must be awaited inside before the
    // returned object resolves the chain.
    await logError("referral", "claimReferral", err, { code });
    return { success: false, error: "Could not apply referral. Please try again." };
  });
}
