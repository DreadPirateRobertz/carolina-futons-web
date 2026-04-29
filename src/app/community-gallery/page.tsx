import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { HeroReveal } from "@/components/motion/HeroReveal";
import {
  listCommunityPhotos,
  type CommunityPhoto,
  type GalleryResult,
} from "@/lib/wix/community-gallery";

export const metadata: Metadata = {
  title: "Community Gallery — Carolina Futons",
  description:
    "Real Carolina Futons in real homes. Photos submitted by customers across the Carolinas and beyond.",
};

// Gallery photos are curated in Wix Data (low write frequency); 1-hour
// revalidation keeps origin load low while keeping newly approved photos fresh.
export const revalidate = 3600;

const IMAGE_SIZES =
  "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw";

function buildAltText(photo: CommunityPhoto): string {
  if (photo.caption) return photo.caption;
  const who = photo.customerName || "Customer";
  const where = photo.location || "the Carolinas";
  return `${who} photo from ${where}`;
}

function PhotoCard({ photo }: { photo: CommunityPhoto }) {
  const attribution = [photo.customerName, photo.location]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="group relative mb-4 break-inside-avoid overflow-hidden rounded-lg bg-cf-ink/5">
      <Image
        src={photo.image}
        alt={buildAltText(photo)}
        width={600}
        height={800}
        sizes={IMAGE_SIZES}
        className="h-auto w-full object-cover"
      />

      {/* Overlay is not aria-hidden because it contains the product link,
          which must stay in the accessibility tree. Caption and attribution
          text are aria-hidden: the link's aria-label already includes the
          caption, so suppressing them avoids a duplicate announcement.
          On mobile (no hover) the overlay is always visible so touch users
          can reach the product link. */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        {photo.caption && (
          <p aria-hidden="true" className="text-sm font-medium leading-snug text-white">
            {photo.caption}
          </p>
        )}
        <p aria-hidden="true" className="mt-1 text-xs text-white/80">
          {attribution}
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
  );
}

function GalleryBody({ result }: { result: GalleryResult }) {
  if (result.error) {
    return (
      <p className="py-16 text-center text-cf-muted" data-testid="gallery-error">
        Something went wrong loading the gallery — please check back soon.
      </p>
    );
  }
  if (result.photos.length === 0) {
    return (
      <p className="py-16 text-center text-cf-muted">
        Photos coming soon — check back after your next visit.
      </p>
    );
  }
  return (
    <div
      className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4"
      data-testid="community-gallery-grid"
    >
      {result.photos.map((photo) => (
        <PhotoCard key={photo._id} photo={photo} />
      ))}
    </div>
  );
}

export default async function CommunityGalleryPage() {
  const result = await listCommunityPhotos(60);

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
            <Link
              href="/community-gallery/submit"
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-cf-espresso px-5 py-2.5 text-sm font-semibold text-white hover:bg-cf-espresso/90 transition-colors"
            >
              Share your photo
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </header>
        </HeroReveal>

        <GalleryBody result={result} />
      </div>
    </main>
  );
}
