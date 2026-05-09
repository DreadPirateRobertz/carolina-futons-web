import Link from "next/link";

import { formatPlpPrice } from "@/lib/product/plp-price";
import { wixImageUrl } from "@/lib/wix/wix-image";
import type { WixProduct } from "@/lib/wix/products";
import type { AlsoBoughtError } from "@/lib/product/also-bought";

export type PdpAlsoBoughtProps = {
  products: ReadonlyArray<WixProduct>;
  error?: AlsoBoughtError;
};

const HEADING_ID = "pdp-also-bought-heading";

export function PdpAlsoBought({ products, error }: PdpAlsoBoughtProps) {
  if (error || products.length === 0) return null;

  return (
    <section
      aria-labelledby={HEADING_ID}
      className="mt-16 border-t border-cf-divider pt-10"
      data-slot="pdp-also-bought"
    >
      <h2
        id={HEADING_ID}
        className="font-heading text-lg font-semibold text-cf-espresso"
      >
        Frequently bought together
      </h2>
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <AlsoBoughtTile key={product._id ?? product.slug ?? product.name} product={product} />
        ))}
      </ul>
    </section>
  );
}

function AlsoBoughtTile({ product }: { product: WixProduct }) {
  const href = product.slug ? `/products/${product.slug}` : "#";
  const imageUrl = product.media?.mainMedia?.image?.url;
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
