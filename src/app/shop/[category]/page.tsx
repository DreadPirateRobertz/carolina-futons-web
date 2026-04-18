import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCollectionBySlug,
  listProductsByCollectionId,
  listProductsOnSale,
  type WixProduct,
} from "@/lib/wix/products";
import {
  SHOP_CATEGORIES,
  findCategory,
  type ShopCategory,
} from "@/lib/shop/categories";
import { formatPlpPrice } from "@/lib/product/plp-price";

export const dynamic = "force-dynamic"; // Phase 2: per-request until facets + caching tags wired

export function generateStaticParams() {
  return SHOP_CATEGORIES.map((category) => ({ category: category.slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: categorySlug } = await props.params;
  const category = findCategory(categorySlug);
  if (!category) return { title: "Shop — Carolina Futons" };
  return {
    title: `${category.name} — Carolina Futons`,
    description: category.description,
  };
}

export default async function PlpPage(props: {
  params: Promise<{ category: string }>;
}) {
  const { category: categorySlug } = await props.params;
  const category = findCategory(categorySlug);
  if (!category) notFound();

  const products = await resolveCategoryProducts(category);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <nav className="text-sm text-zinc-500">
        <Link href="/shop" className="hover:underline">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">{category.name}</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          {category.name}
        </h1>
        <p className="mt-2 text-zinc-600">{category.description}</p>
        <p className="mt-4 text-sm text-zinc-500">
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>
      </header>

      {products.length === 0 ? (
        <p className="mt-10 rounded-md bg-zinc-50 p-6 text-zinc-700">
          {category.slug === "mattresses-sale"
            ? "No mattresses are on sale right now. Check back soon."
            : `No products found in this collection yet. Phase 0 smoke may not have populated ${category.collectionSlug}.`}
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </ul>
      )}
    </main>
  );
}

// cf-3qt.6.D: /shop/mattresses-sale is derived from the mattresses collection
// filtered to products with an active Wix Stores discount, not a hand-curated
// "mattresses-sale" collection.
async function resolveCategoryProducts(
  category: ShopCategory,
): Promise<WixProduct[]> {
  const sourceSlug =
    category.slug === "mattresses-sale" ? "mattresses" : category.collectionSlug;
  const collection = await getCollectionBySlug(sourceSlug);
  if (!collection?._id) return [];
  if (category.slug === "mattresses-sale") {
    return listProductsOnSale(collection._id);
  }
  return listProductsByCollectionId(collection._id);
}

function ProductCard({ product }: { product: WixProduct }) {
  const href = product.slug ? `/products/${product.slug}` : "#";
  const mainUrl = product.media?.mainMedia?.image?.url;
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
          <p className="mt-1 text-sm text-zinc-600">
            {formatPlpPrice(product)}
          </p>
        </div>
      </Link>
    </li>
  );
}
