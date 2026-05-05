// cfw-8cx: PDP BNPL messaging widget — "As low as $X/mo with Affirm"
// teaser below the price, click-to-expand for 4 / 12 / 24-month breakdowns
// plus Affirm and Afterpay brand chips.
//
// Why we don't load the live Affirm/Afterpay JS SDKs here:
//   - Both SDKs render asynchronously into a placeholder, which causes CLS
//     during PDP load — the spec explicitly forbids that.
//   - The SDKs set tracking cookies that need consent gating (we'd block on
//     the cookie banner) and slow time-to-interactive on the buy-box.
//   - This widget is messaging-only; the actual Affirm checkout flow lives
//     downstream after the visitor proceeds to checkout, where the SDK can
//     load without competing with the buy-box.
// Static SSR-friendly markup keeps the initial paint stable and the
// underlying math (price / N months) is identical to what the live SDK
// would surface, so the visitor isn't misled by the teaser.

"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

const BNPL_MIN_CENTS = 5_000; // $50 — Affirm/Afterpay minimum order thresholds.
const TERMS = [4, 12, 24] as const;

export type BnplWidgetProps = {
  unitPriceCents: number;
};

export function BnplWidget({ unitPriceCents }: BnplWidgetProps) {
  const headingId = useId();
  const panelId = useId();
  const [open, setOpen] = useState(false);

  if (!Number.isFinite(unitPriceCents) || unitPriceCents < BNPL_MIN_CENTS) {
    return null;
  }

  const priceDollars = unitPriceCents / 100;
  // Ceil to a whole dollar so the teaser reads cleanly ("$67/mo", not
  // "$66.58/mo") and never understates the actual installment.
  const teaserMonthly = Math.ceil(priceDollars / 12);

  return (
    <section
      data-slot="pdp-bnpl-widget"
      data-testid="pdp-bnpl-widget"
      aria-labelledby={headingId}
      className="rounded-md border border-cf-divider bg-cf-cream/40 p-3"
    >
      <h3 id={headingId} className="sr-only">
        Buy now, pay later
      </h3>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        data-testid="bnpl-trigger"
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex flex-wrap items-center gap-2 text-sm text-cf-espresso">
          <span>
            As low as{" "}
            <span className="font-semibold">${teaserMonthly}/mo</span> with
          </span>
          <AffirmBadge />
        </span>
        <ChevronDown
          className={cnExpand(open)}
          aria-hidden="true"
        />
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        hidden={!open}
        data-testid="bnpl-panel"
        className="mt-3 space-y-3 border-t border-cf-divider pt-3"
      >
        <ul
          role="list"
          aria-label="Installment plan options"
          className="grid grid-cols-3 gap-2"
        >
          {TERMS.map((months) => {
            const installment = priceDollars / months;
            return (
              <li
                key={months}
                data-testid={`bnpl-term-${months}`}
                className="rounded-md border border-cf-sand bg-white px-2 py-2 text-center"
              >
                <p className="text-xs font-medium text-cf-espresso/70">
                  {months} mo
                </p>
                <p className="text-sm font-semibold text-cf-espresso">
                  {formatDollars(installment)}/mo
                </p>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-cf-espresso/60">
          Subject to lender approval. Final terms shown at checkout. Pay in 4
          available with Afterpay on orders up to $1,000.
        </p>
        <div
          className="flex flex-wrap items-center gap-2"
          aria-label="Available BNPL providers"
        >
          <AffirmBadge />
          <AfterpayBadge />
        </div>
      </div>
    </section>
  );
}

function formatDollars(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Brand-coloured text chips stand in for the Affirm/Afterpay JS-rendered
// logos. Recognisable enough for messaging, no third-party JS, no licensing
// surface area. role="img" + aria-label keep the brand name available to
// screen readers without forcing it into the visible run.
function AffirmBadge() {
  return (
    <span
      role="img"
      aria-label="Affirm"
      data-testid="bnpl-logo-affirm"
      className="inline-flex items-center rounded-md bg-[#0FA0EA] px-2 py-0.5 font-sans text-xs font-bold tracking-tight text-white"
    >
      affirm
    </span>
  );
}

function AfterpayBadge() {
  return (
    <span
      role="img"
      aria-label="Afterpay"
      data-testid="bnpl-logo-afterpay"
      className="inline-flex items-center rounded-md bg-[#B2FCE4] px-2 py-0.5 font-sans text-xs font-bold tracking-tight text-black"
    >
      afterpay
    </span>
  );
}

function cnExpand(open: boolean): string {
  // Small chevron rotation; static class string to keep Tailwind JIT happy.
  return [
    "size-4 shrink-0 text-cf-espresso/60 transition-transform",
    open ? "rotate-180" : "",
  ]
    .join(" ")
    .trim();
}
