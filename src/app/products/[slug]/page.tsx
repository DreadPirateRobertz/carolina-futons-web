import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/wix/products";

export const dynamic = "force-dynamic"; // Phase 2: per-request until facets + caching tags wired

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product — Carolina Futons" };
  return {
    title: `${product.name} — Carolina Futons`,
    description: stripHtml(product.description ?? "").slice(0, 160),
  };
}

export default async function PdpPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const mainUrl = product.media?.mainMedia?.image?.url;
  const gallery = product.media?.items ?? [];
  const price = product.priceData?.formatted?.price ?? "";
  const descriptionText = stripHtml(product.description ?? "");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <nav className="text-sm text-zinc-500">
        <Link href="/shop" className="hover:underline">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">{product.name}</span>
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          {mainUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mainUrl}
              alt={product.name ?? ""}
              className="aspect-square w-full rounded-lg object-cover"
            />
          ) : (
            <div className="aspect-square w-full rounded-lg bg-zinc-100" />
          )}
          {gallery.length > 1 ? (
            <ul className="mt-3 grid grid-cols-4 gap-2">
              {gallery.slice(0, 8).map((item, i) => {
                const url = item.image?.url;
                if (!url) return null;
                return (
                  <li
                    key={item._id ?? i}
                    className="overflow-hidden rounded border border-zinc-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {product.name}
          </h1>
          {price ? (
            <p className="mt-3 text-2xl font-medium text-zinc-900">{price}</p>
          ) : null}

          {descriptionText ? (
            <p className="mt-6 whitespace-pre-line text-zinc-700">
              {descriptionText}
            </p>
          ) : null}

          {/* Phase 2 placeholder — variants + add-to-cart lands in the next slice. */}
          <div className="mt-8 rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
            Variant picker + add-to-cart arrives in the next commerce slice.
          </div>
        </div>
      </div>
    </main>
  );
}

// Wix Stores `product.description` is HTML. Phase 2 placeholder: strip tags and
// render as plain text. Rich-HTML rendering with a sanitizer (DOMPurify or
// server-side sanitize-html) lands in a later slice alongside the PDP polish.
function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
