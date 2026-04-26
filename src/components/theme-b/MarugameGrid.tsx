"use client";

// Theme B — Marugame Grid: massive product grid with lazy-reveal.
// Items animate in via framer-motion useInView as they enter the viewport,
// mimicking the feel of a lazy-loaded editorial grid. "Load more" fetches
// additional products via a server action without a full navigation.
//
// Reduced-motion: framer-motion useReducedMotion kills all transforms so
// items appear immediately at full opacity instead of fading up.

import { useRef, useState, useTransition } from "react";
import { m, useInView, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

import { formatPlpPrice } from "@/lib/product/plp-price";
import { getPlpCardImages } from "@/lib/product/plp-card-images";
import type { WixProduct } from "@/lib/wix/products";
import { fetchMoreMarugameProducts } from "./actions";

type Props = {
  initial: WixProduct[];
  pageSize?: number;
};

// Stagger each grid item's reveal by this many ms per index.
const STAGGER_MS = 60;

function GridItem({
  product,
  index,
  lead,
}: {
  product: WixProduct;
  index: number;
  lead: boolean;
}): React.ReactElement {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -80px 0px" });
  const prefersReducedMotion = useReducedMotion() ?? false;

  const images = getPlpCardImages(product);
  const src = images.primary ?? "";
  const price = formatPlpPrice(product);
  const href = `/products/${product.slug ?? ""}`;

  const variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 28 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <m.li
      ref={ref}
      className={lead ? "col-span-2" : "col-span-1"}
      variants={variants}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      transition={{
        duration: 0.5,
        ease: "easeOut",
        delay: (index % 6) * (STAGGER_MS / 1000),
      }}
    >
      <Link
        href={href}
        className="group block"
        aria-label={product.name ?? "Product"}
      >
        <div
          className={`relative w-full overflow-hidden bg-cf-sand/30 ${lead ? "aspect-[16/7]" : "aspect-[3/4]"}`}
        >
          {src ? (
            <Image
              src={src}
              alt={product.name ?? ""}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              sizes={
                lead
                  ? "(min-width: 640px) 100vw, 100vw"
                  : "(min-width: 640px) 50vw, 100vw"
              }
              priority={index < 2}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-cf-charcoal/20">
              <span className="font-heading text-sm italic">No image</span>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-1">
          <h3 className="font-heading text-xl font-normal italic leading-snug tracking-[-0.02em] text-cf-navy group-hover:text-cf-cta">
            {product.name}
          </h3>
          {price && (
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cf-charcoal/60">
              {price}
            </p>
          )}
        </div>
      </Link>
    </m.li>
  );
}

export function MarugameGrid({
  initial,
  pageSize = 8,
}: Props): React.ReactElement {
  const [products, setProducts] = useState<WixProduct[]>(initial);
  const [exhausted, setExhausted] = useState(initial.length < pageSize);
  const [isPending, startTransition] = useTransition();

  function loadMore() {
    startTransition(async () => {
      const next = await fetchMoreMarugameProducts(products.length, pageSize);
      if (next.length < pageSize) setExhausted(true);
      setProducts((prev) => [...prev, ...next]);
    });
  }

  return (
    <section aria-label="Products" className="px-6 py-16 sm:px-10 sm:py-20">
      <ul className="grid grid-cols-2 gap-x-6 gap-y-16">
        {products.map((product, i) => (
          <GridItem
            key={product._id}
            product={product}
            index={i}
            // First product is the editorial lead — spans both columns
            lead={i === 0}
          />
        ))}
      </ul>

      {!exhausted && (
        <div className="mt-20 flex justify-center">
          <button
            onClick={loadMore}
            disabled={isPending}
            className="border-b border-cf-navy pb-0.5 text-xs font-medium uppercase tracking-[0.22em] text-cf-navy transition-opacity hover:opacity-60 disabled:opacity-40"
          >
            {isPending ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </section>
  );
}
