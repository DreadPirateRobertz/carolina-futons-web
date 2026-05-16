import { ProductCard } from "@/components/product/ProductCard";
import type { WixProduct } from "@/lib/wix/products";
import type { FeaturedRowConfig } from "@/lib/shop/categories";
import type { ProductBadgeType } from "@/lib/wix/product-badges";

/**
 * Editorial "featured" strip rendered above the main PLP grid (cfw-75v).
 *
 * Renders the eyebrow / heading / body editorial copy from `config` then a
 * 3-column product grid (1 col on mobile, 3 cols at sm+) using `ProductCard`.
 * All 3 cards mark themselves above-the-fold (`priority=true`) since the
 * strip is the first paint on a PLP that ships with it.
 *
 * Hides itself (returns `null`) when `products.length < 3` — the page resolves
 * the slugs in `config.productSlugs` and may receive fewer hits from
 * out-of-catalog drift, in which case a partial strip would look broken next
 * to the editorial heading. Treat any non-3 result as "don't render."
 *
 * Server-only by construction (no client hooks); imports `ProductCard` which
 * is itself server-renderable.
 *
 * @param config Editorial copy + slug list pulled from `ShopCategory.featured`.
 * @param products Live Wix products resolved by the page (`getProductBySlug`
 *   for each entry in `config.productSlugs`); the page filters out nulls
 *   before passing in.
 * @param badges Per-product badge lookup (same shape the main grid receives
 *   from `listAllProductBadges`); used so the featured strip shows the same
 *   "Best seller" / "Free shipping" badges as the grid below.
 * @returns A `<section>` with the 3-card strip, or `null` when fewer than 3
 *   products resolved.
 */
export function PLPFeaturedRow({
  config,
  products,
  badges,
}: {
  config: FeaturedRowConfig;
  products: readonly WixProduct[];
  badges: ReadonlyMap<string, readonly ProductBadgeType[]>;
}) {
  if (products.length < 3) return null;

  const headingId = "plp-featured-row-heading";

  return (
    <section
      aria-labelledby={headingId}
      data-slot="plp-featured-row"
      className="mt-8"
    >
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
          {config.eyebrow}
        </p>
        <h2
          id={headingId}
          className="mt-2 font-heading text-2xl font-semibold tracking-tight text-cf-ink sm:text-3xl"
        >
          {config.heading}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-cf-charcoal/80">
          {config.body}
        </p>
      </header>

      <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {products.slice(0, 3).map((product) => (
          <li key={product._id}>
            <ProductCard
              product={product}
              priority
              badges={badges.get(product.slug ?? "") ?? []}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
