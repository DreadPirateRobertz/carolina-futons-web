import { optionalEnv } from "@/lib/env";

export type BalanceResult =
  | { found: true; balance: number; status: string; expirationDate: string | null; initialAmount: number }
  | { found: false };

function veloBase(): string {
  return optionalEnv("WIX_VELO_SITE_URL").replace(/\/$/, "");
}

export async function checkGiftCardBalance(code: string): Promise<BalanceResult> {
  try {
    const url = `${veloBase()}/_functions/giftCardBalance?code=${encodeURIComponent(code)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { found: false };
    return (await res.json()) as BalanceResult;
  } catch {
    return { found: false };
  }
}
