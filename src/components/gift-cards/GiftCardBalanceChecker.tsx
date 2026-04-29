"use client";

import { useState, useTransition } from "react";
import { checkGiftCardBalance, type BalanceResult } from "@/lib/wix/gift-cards";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "No expiration";
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

export function GiftCardBalanceChecker() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<BalanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCheck() {
    if (!code.trim()) return;
    setError(null);
    setResult(null);
    startTransition(async () => {
      const r = await checkGiftCardBalance(code.trim().toUpperCase());
      setResult(r);
      if (!r.found) setError("Card not found. Check the code and try again.");
    });
  }

  return (
    <div className="rounded-xl border border-cf-divider bg-cf-cream p-6 space-y-4">
      <h2 className="font-heading text-lg font-semibold text-cf-espresso">Check your balance</h2>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-cf-espresso placeholder:text-gray-400 focus:border-cf-espresso focus:outline-none focus:ring-1 focus:ring-cf-espresso"
          aria-label="Gift card code"
        />
        <button
          onClick={handleCheck}
          disabled={isPending || !code.trim()}
          className="shrink-0 rounded-lg bg-cf-espresso px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-cf-espresso/90 transition-colors"
        >
          {isPending ? "Checking…" : "Check"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {result && result.found && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-1">
          <p className="text-lg font-bold text-green-800">
            Balance: <span>${result.balance.toFixed(2)}</span>
          </p>
          {result.status === "expired" && (
            <p className="text-sm text-amber-700">This card has expired.</p>
          )}
          {result.status !== "expired" && result.expirationDate && (
            <p className="text-xs text-green-700">
              Expires: {formatDate(result.expirationDate)}
            </p>
          )}
          {result.initialAmount && result.initialAmount !== result.balance && (
            <p className="text-xs text-green-700">
              Original value: ${result.initialAmount.toFixed(2)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
