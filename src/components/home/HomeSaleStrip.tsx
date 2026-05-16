import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { getCollectionBySlug, listProductsByCollectionId } from "@/lib/wix/products";

const SALE_COLLECTION_SLUGS = ["sale", "mattresses-sale"] as const;
const MAX_PRODUCTS = 8;

async function fetchSaleProducts() {
  for (const slug of SALE_COLLECTION_SLUGS) {
    const collection = await getCollectionBySlug(slug);
    if (collection?._id) {
      const products = await listProductsByCollectionId(collection._id, MAX_PRODUCTS);
      if (products.length > 0) return { slug, products };
    }
  }
  return null;
}

export async function HomeSaleStrip() {
  const data = await fetchSaleProducts();
  if (!data) return null;

  const { products } = data;

  return (
    <section className="border-t border-cf-divider bg-red-50/60 py-12 dark:bg-cf-sand">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-red-600 dark:text-red-400">
              On Sale Now
            </p>
            <h2 className="mt-1 font-heading text-2xl font-bold text-cf-espresso">
              Sale Items
            </h2>
          </div>
          <Link
            href="/shop/sale"
            className="shrink-0 rounded-sm text-sm font-medium text-cf-espresso underline underline-offset-2 hover:text-cf-espresso/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
          >
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product, i) => (
            <ProductCard
              key={product._id ?? product.slug}
              product={product}
              priority={i < 4}
              sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
