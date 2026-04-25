// cf-3r9v: white-glove delivery promo on PDP for orders >= $1500.
//
// Phase-1 scope: gate purely on price. Bead notes "Tie to /api/delivery-zone
// result" as the eventual integration — that endpoint is currently a
// scaffold (godfrey owns implementation per the route comment), so the
// component renders unconditionally above threshold today and a follow-up
// will narrow visibility to local-zone ZIPs once the endpoint resolves.

const WHITE_GLOVE_THRESHOLD_CENTS = 150_000; // $1,500

export type PdpWhiteGloveProps = {
  unitPriceCents: number;
  className?: string;
};

export function PdpWhiteGlove({
  unitPriceCents,
  className,
}: PdpWhiteGloveProps) {
  if (
    !Number.isFinite(unitPriceCents) ||
    unitPriceCents < WHITE_GLOVE_THRESHOLD_CENTS
  ) {
    return null;
  }

  return (
    <aside
      role="region"
      aria-label="Free white-glove delivery"
      data-slot="pdp-white-glove"
      className={
        "rounded-md border border-cf-cta/30 bg-cf-cream p-4 " +
        (className ?? "")
      }
    >
      <p className="text-sm font-medium text-cf-navy">
        Free white-glove delivery
      </p>
      <p className="mt-1 text-sm text-cf-charcoal/85">
        Orders over $1,500 ship with white-glove service — schedule
        delivery at checkout.
      </p>
    </aside>
  );
}
