"use server";

import { cookies } from "next/headers";
import {
  SPIN_PRIZES,
  type SpinActionState,
  type SpinPrize,
} from "@/app/spin/spin-state";
import { logError } from "@/lib/logging/log-error";

const COOLDOWN_HOURS = 24;
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;
const SPIN_COOKIE = "cf_spin_last";

function pickPrize(): SpinPrize {
  // Weighted: try-again is 2x as likely; jackpot (10off) is rarest
  const weighted = [
    ...Array(3).fill(SPIN_PRIZES[0]),   // 5off   — 3 slots
    ...Array(1).fill(SPIN_PRIZES[1]),   // 10off  — 1 slot (rarest)
    ...Array(3).fill(SPIN_PRIZES[2]),   // freeswap — 3 slots
    ...Array(3).fill(SPIN_PRIZES[3]),   // fship  — 3 slots
    ...Array(2).fill(SPIN_PRIZES[4]),   // bdeal  — 2 slots
    ...Array(6).fill(SPIN_PRIZES[5]),   // nomatch — 6 slots (most common)
  ] as SpinPrize[];
  return weighted[Math.floor(Math.random() * weighted.length)];
}

export async function spinWheel(
  _prev: SpinActionState,
): Promise<SpinActionState> {
  const jar = await cookies();
  const lastSpinRaw = jar.get(SPIN_COOKIE)?.value;

  if (lastSpinRaw) {
    const lastSpin = parseInt(lastSpinRaw, 10);
    const elapsed = Date.now() - lastSpin;
    if (elapsed < COOLDOWN_MS) {
      const hoursLeft = Math.ceil((COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
      return {
        status: "error",
        error: `You already spun today. Come back in ${hoursLeft} hour${hoursLeft !== 1 ? "s" : ""}.`,
      };
    }
  }

  const prize = pickPrize();

  jar.set(SPIN_COOKIE, String(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: COOLDOWN_MS / 1000,
    path: "/",
  });

  // Fire-and-forget: record grant to Wix backend. Failures are non-fatal —
  // the prize is shown regardless; the Velo function can be wired later.
  const base = process.env.WIX_VELO_SITE_URL;
  if (base && prize.id !== "nomatch") {
    void fetch(`${base.replace(/\/$/, "")}/_functions/recordSpinGrant`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prizeId: prize.id }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    }).catch((err) => {
      // cfw-mbx0: fire-and-forget — kick off the logError but don't
      // await it (the surrounding code path already returned a prize to
      // the user; nothing useful happens by blocking on the Sentry POST).
      void logError("spin", "recordSpinGrant", err, { prizeId: prize.id });
    });
  }

  return { status: "success", prize, cooldownHours: COOLDOWN_HOURS };
}
