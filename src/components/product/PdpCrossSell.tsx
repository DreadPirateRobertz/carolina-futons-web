import Link from "next/link";

import { formatPlpPrice } from "@/lib/product/plp-price";
import { wixImageUrl } from "@/lib/wix/wix-image";
import type { WixProduct } from "@/lib/wix/products";
import type { CrossSellError } from "@/lib/product/cross-sell";

export type PdpCrossSellProps = {
  products: ReadonlyArray<WixProduct>;
  // When set, the upstream reader failed. Kept silent on the PDP — Sentry has
  // already captured — but passed through so the contract is explicit.
  error?: CrossSellError;
};

const HEADING_ID = "pdp-cross-sell-heading";

export function PdpCrossSell({ products, error }: PdpCrossSellProps) {
  if (error || products.length === 0) return null;

  return (
    <section
      aria-labelledby={HEADING_ID}
      className="mt-16 border-t border-cf-divider pt-10"
      data-slot="pdp-cross-sell"
    >
      <h2
        id={HEADING_ID}
        className="font-heading text-lg font-semibold text-cf-espresso"
      >
        You might also like
      </h2>
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <CrossSellTile key={product._id ?? product.slug ?? product.name} product={product} />
        ))}
      </ul>
    </section>
  );
}

function CrossSellTile({ product }: { product: WixProduct }) {
  const href = product.slug ? `/products/${product.slug}` : "#";
  const imageUrl = product.media?.mainMedia?.image?.url;
  // cf-24q: use priceRange-aware formatter so manageVariants products don't
  // show "$0.00" in the cross-sell tile (rennala P2 from PR #41 review).
  const priceText = formatPlpPrice(product) || null;
  const name = product.name ?? "";

  return (
    <li className="group rounded-lg border border-transparent transition hover:border-cf-sand">
      <Link href={href} className="block">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wixImageUrl(imageUrl, 240, 240)}
            alt={name}
            className="aspect-square w-full rounded-md object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="aspect-square w-full rounded-md bg-cf-sand/40"
          />
        )}
        <div className="mt-2 px-1">
          <p className="text-sm font-medium text-cf-espresso">{name}</p>
          {priceText ? (
            <p className="text-sm text-cf-espresso/70">{priceText}</p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
