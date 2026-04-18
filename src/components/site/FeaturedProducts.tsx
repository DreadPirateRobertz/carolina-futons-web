import Link from "next/link";

import { ProductCard } from "@/components/product/ProductCard";
import type { WixProduct } from "@/lib/wix/products";

// Home page Featured strip (cf-5j9x). Purely presentational — data fetching
// lives in src/lib/shop/featured.ts so the section itself can be rendered
// with any product list (preview, curation swap, test fixture).
export function FeaturedProducts({ products }: { products: readonly WixProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby="featured-heading"
      className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2
            id="featured-heading"
            className="font-heading text-2xl font-semibold text-cf-navy sm:text-3xl"
          >
            Featured
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-cf-charcoal/80">
            A handful of pieces we&rsquo;re proud of right now — straight from
            our Hendersonville workshop and showroom.
          </p>
        </div>
        <Link
          href="/shop"
          className="shrink-0 text-sm font-medium text-cf-cta hover:underline"
        >
          View all →
        </Link>
      </div>

      <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {products.map((product) => (
          <li key={product._id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}
