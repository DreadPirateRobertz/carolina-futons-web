"use client";

import { useEffect, useId, useRef, useState } from "react";

const FINANCING_GATE_CENTS = 50_000; // $500
const AFTERPAY_MAX_CENTS = 100_000; // $1,000
const TERMS = [3, 6, 12] as const;

function roundCents(v: number) {
  return Math.round(v * 100) / 100;
}

function monthly(priceDollars: number, months: number): number {
  return roundCents(priceDollars / months);
}

function fmt(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function afterpayInstallment(priceDollars: number): number {
  return roundCents(priceDollars / 4);
}

// price/12 < price/4 always for positive prices, so Afterpay never produces
// the lowest monthly amount — lowestMonthly is always the 12-month term.
function lowestMonthly(priceDollars: number): number {
  return Math.min(...TERMS.map((m) => monthly(priceDollars, m)));
}

export type PdpFinancingProps = {
  unitPriceCents: number;
};

export function PdpFinancing({ unitPriceCents }: PdpFinancingProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const headingId = useId();
  const modalTitleId = useId();

  if (!Number.isFinite(unitPriceCents) || unitPriceCents < FINANCING_GATE_CENTS) {
    return null;
  }

  const priceDollars = unitPriceCents / 100;
  const afterpayEligible = unitPriceCents <= AFTERPAY_MAX_CENTS;
  const installment = afterpayEligible ? afterpayInstallment(priceDollars) : 0;
  const lowest = lowestMonthly(priceDollars);

  return (
    <section data-testid="pdp-financing" aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="text-sm font-semibold text-cf-espresso">
        Financing options
      </h2>

      <p className="text-sm text-cf-espresso/80">
        As low as ${Math.ceil(lowest)}/mo
      </p>

      {afterpayEligible && (
        <p data-testid="afterpay-teaser" className="text-sm text-cf-espresso/70">
          4 payments of {fmt(installment)} with Afterpay
        </p>
      )}

      <div className="flex gap-2" role="list" aria-label="Financing term options">
        {TERMS.map((m) => (
          <div
            key={m}
            role="listitem"
            data-testid={`pill-${m}`}
            className="rounded-md border border-cf-sand px-3 py-2 text-center text-xs text-cf-espresso"
          >
            <div className="font-medium">{m} mo</div>
            <div>{fmt(monthly(priceDollars, m))}/mo</div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="text-sm underline text-cf-espresso/70 hover:text-cf-espresso"
      >
        See all options
      </button>

      {modalOpen && (
        <FinancingModal
          priceDollars={priceDollars}
          afterpayEligible={afterpayEligible}
          installment={installment}
          titleId={modalTitleId}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
}

type ModalProps = {
  priceDollars: number;
  afterpayEligible: boolean;
  installment: number;
  titleId: string;
  onClose: () => void;
};

function FinancingModal({
  priceDollars,
  afterpayEligible,
  installment,
  titleId,
  onClose,
}: ModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Escape dismissal + focus the close button on mount so keyboard users
  // land on an actionable control, matching PdpImageLightbox convention.
  useEffect(() => {
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const afterpaySchedule = [
    { label: "Today", amount: installment },
    { label: "In 2 weeks", amount: installment },
    { label: "In 4 weeks", amount: installment },
    // Reconcile rounding — last installment picks up any cent remainder;
    // clamped to 0 to guard against floating-point underflow.
    {
      label: "In 6 weeks",
      amount: Math.max(0, roundCents(priceDollars - installment * 3)),
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-cf-cream">
        <div className="flex items-center justify-between mb-4">
          <h3 id={titleId} className="font-heading text-lg font-semibold text-cf-espresso">
            Financing &amp; payment options
          </h3>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close financing options"
            className="rounded p-1 text-cf-espresso hover:bg-cf-sand"
          >
            ✕
          </button>
        </div>

        {afterpayEligible && (
          <div className="mb-4 rounded-lg border border-cf-sand p-4">
            <p className="font-medium text-cf-espresso">Pay in 4</p>
            <p className="text-sm text-cf-espresso/70 mt-1">
              4 interest-free payments of {fmt(installment)} with Afterpay
            </p>
            <ul className="mt-2 space-y-1 text-xs text-cf-espresso/60">
              {afterpaySchedule.map(({ label, amount }) => (
                <li key={label}>
                  {label}: {fmt(amount)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          {TERMS.map((m) => {
            const mo = monthly(priceDollars, m);
            return (
              <div
                key={m}
                data-testid={`modal-term-${m}`}
                className="rounded-lg border border-cf-sand p-4"
              >
                <p className="font-medium text-cf-espresso">{m}-month plan</p>
                <p className="text-sm text-cf-espresso/70">
                  {fmt(mo)}/mo · 0% APR
                </p>
                <p className="text-xs text-cf-espresso/50 mt-1">
                  Total: {fmt(priceDollars)}
                </p>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-cf-espresso/50">
          Financing subject to approval. Subject to change without notice.
        </p>
      </div>
    </div>
  );
}
