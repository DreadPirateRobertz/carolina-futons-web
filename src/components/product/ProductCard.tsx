import Link from "next/link";
import { formatPlpPrice } from "@/lib/product/plp-price";
import type { WixProduct } from "@/lib/wix/products";

function hasDiscount(product: WixProduct): boolean {
  const price = product.priceData?.price;
  const discounted = product.priceData?.discountedPrice;
  return (
    typeof price === "number" &&
    typeof discounted === "number" &&
    discounted < price
  );
}

function hasRange(product: WixProduct): boolean {
  const min = product.priceRange?.minValue;
  const max = product.priceRange?.maxValue;
  return typeof min === "number" && typeof max === "number" && max > 0;
}

export function ProductCard({ product }: { product: WixProduct }) {
  const href = product.slug ? `/products/${product.slug}` : "#";
  const mainUrl = product.media?.mainMedia?.image?.url;
  const showStrikethrough = hasDiscount(product) && !hasRange(product);

  return (
    <li className="rounded-lg border border-zinc-200 hover:border-zinc-400">
      <Link href={href} className="block">
        {mainUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mainUrl}
            alt={product.name ?? ""}
            className="aspect-square w-full rounded-t-lg object-cover"
          />
        ) : (
          <div className="aspect-square w-full rounded-t-lg bg-zinc-100" />
        )}
        <div className="p-4">
          <h2 className="text-base font-medium">{product.name}</h2>
          {showStrikethrough ? (
            <div className="mt-1 flex items-center gap-2 text-sm">
              <span className="line-through text-zinc-400">
                {product.priceData?.formatted?.price}
              </span>
              <span className="font-medium text-red-600">
                {product.priceData?.formatted?.discountedPrice}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-zinc-600">
              {formatPlpPrice(product)}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
