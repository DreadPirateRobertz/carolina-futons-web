import type { ProductBadgeType } from "@/lib/wix/product-badges";

const BADGE_STYLES: Record<ProductBadgeType, string> = {
  New: "bg-cf-navy/10 text-cf-navy",
  Bestseller: "bg-amber-100 text-amber-800",
  Sale: "bg-red-100 text-red-700",
  "CF+ Exclusive": "bg-purple-100 text-purple-800",
};

export function PdpProductBadges({
  badges,
}: {
  badges: readonly ProductBadgeType[];
}) {
  if (badges.length === 0) return null;

  return (
    <div data-slot="product-badges" className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge}
          data-badge={badge}
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_STYLES[badge]}`}
        >
          {badge}
        </span>
      ))}
    </div>
  );
}
