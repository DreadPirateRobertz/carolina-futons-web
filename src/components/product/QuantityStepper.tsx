/**
 * cf-pdp-g1: PDP quantity stepper. Closes the qty=1-always parity gap
 * (cf-lc1c G-1): cfw PdpInteractive previously never passed a quantity
 * to AddToCartButton so every PDP click added qty 1, regardless of
 * intent. Wix had +/− buttons with clampQuantity(MIN, MAX); this is the
 * cfw equivalent.
 *
 * Controlled component — caller owns the value, this widget calls
 * onChange with the next quantity. Typed input is clamped to [min, max]
 * on blur (lets the user finish typing "12" without snapping at "1").
 */
"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

export const DEFAULT_QTY_MIN = 1;
export const DEFAULT_QTY_MAX = 99;

export type QuantityStepperProps = {
  value: number;
  onChange: (next: number) => void;
  productName: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
};

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return Math.floor(n);
}

export function QuantityStepper({
  value,
  onChange,
  productName,
  min = DEFAULT_QTY_MIN,
  max = DEFAULT_QTY_MAX,
  disabled = false,
  className,
}: QuantityStepperProps) {
  // Mirror the prop into a string so the user can type intermediate
  // states (e.g., empty while erasing-then-retyping) without the input
  // snapping back to the last valid number mid-edit.
  const [draft, setDraft] = useState<string>(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const atMin = value <= min;
  const atMax = value >= max;

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    const next = Number.isFinite(parsed) ? clamp(parsed, min, max) : value;
    onChange(next);
    setDraft(String(next));
  };

  return (
    <div
      data-testid="qty-stepper"
      className={
        "inline-flex items-center gap-0 rounded-md border border-cf-sand " +
        "bg-white text-cf-ink dark:border-zinc-700 dark:bg-zinc-900 dark:text-cf-cream " +
        (className ?? "")
      }
    >
      <button
        type="button"
        data-testid="qty-stepper-minus"
        aria-label={`Decrease quantity of ${productName}`}
        onClick={() => onChange(clamp(value - 1, min, max))}
        disabled={disabled || atMin}
        className="inline-flex h-10 w-10 items-center justify-center text-cf-ink/80 transition hover:bg-cf-sand/50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-cf-cream/80 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-espresso focus-visible:ring-offset-2"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        data-testid="qty-stepper-input"
        aria-label={`Quantity of ${productName}`}
        value={draft}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit((e.target as HTMLInputElement).value);
          }
        }}
        // Hide the native number-input spinner — the +/− buttons are the
        // canonical control surface; the input itself is only there for
        // direct keyboard entry on desktop and the numeric keypad on mobile.
        className="h-10 w-12 border-x border-cf-sand bg-transparent text-center font-medium [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:bg-cf-sand/30 dark:border-zinc-700 dark:focus-visible:bg-zinc-800"
      />
      <button
        type="button"
        data-testid="qty-stepper-plus"
        aria-label={`Increase quantity of ${productName}`}
        onClick={() => onChange(clamp(value + 1, min, max))}
        disabled={disabled || atMax}
        className="inline-flex h-10 w-10 items-center justify-center text-cf-ink/80 transition hover:bg-cf-sand/50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-cf-cream/80 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-espresso focus-visible:ring-offset-2"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
