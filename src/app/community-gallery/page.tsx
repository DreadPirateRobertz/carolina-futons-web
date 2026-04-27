import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { HeroReveal } from "@/components/motion/HeroReveal";
import { listCommunityPhotos } from "@/lib/wix/community-gallery";

export const metadata: Metadata = {
  title: "Community Gallery — Carolina Futons",
  description:
    "Real Carolina Futons in real homes. Photos submitted by customers across the Carolinas and beyond.",
};

export const revalidate = 3600;

export default async function CommunityGalleryPage() {
  const photos = await listCommunityPhotos(60);

  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl space-y-12 font-source-sans text-cf-ink">
        <HeroReveal>
          <header className="mx-auto max-w-[65ch] space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
              Community gallery
            </p>
            <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
              Carolina Futons in real homes
            </h1>
            <p className="text-lg leading-relaxed text-cf-muted">
              Photos from customers across the Carolinas and beyond. Every
              photo links to the product — so if you love what you see, you
              can find it.
            </p>
          </header>
        </HeroReveal>

        {photos.length === 0 ? (
          <p className="py-16 text-center text-cf-muted">
            Photos coming soon — check back after your next visit.
          </p>
        ) : (
          <div
            className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4"
            data-testid="community-gallery-grid"
          >
            {photos.map((photo) => (
              <article
                key={photo._id}
                className="group relative mb-4 break-inside-avoid overflow-hidden rounded-lg bg-cf-ink/5"
              >
                <Image
                  src={photo.image}
                  alt={
                    photo.caption ||
                    `${photo.customerName || "Customer"} photo from ${photo.location || "the Carolinas"}`
                  }
                  width={600}
                  height={800}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  className="h-auto w-full object-cover"
                />

                {/* Hover overlay — visible on hover/focus-within; not aria-hidden so
                    the product link remains in the accessibility tree */}
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                  {photo.caption && (
                    <p aria-hidden="true" className="text-sm font-medium leading-snug text-white">
                      {photo.caption}
                    </p>
                  )}
                  <p aria-hidden="true" className="mt-1 text-xs text-white/80">
                    {[photo.customerName, photo.location]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {photo.productSlug && (
                    <Link
                      href={`/products/${photo.productSlug}`}
                      data-testid="product-link"
                      aria-label={`View product${photo.caption ? ` — ${photo.caption}` : ""}`}
                      className="mt-2 inline-block text-xs font-medium uppercase tracking-[0.12em] text-cf-cta underline-offset-2 hover:underline focus:underline"
                    >
                      View product →
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
