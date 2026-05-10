import type { Metadata } from "next";
import Link from "next/link";
import { PhotoSubmitForm } from "@/components/gallery/PhotoSubmitForm";
import { DEFAULT_OG_IMAGE } from "@/lib/og";

const TITLE = "Share Your Photo — Community Gallery | Carolina Futons";
const DESCRIPTION =
  "Show us your Carolina Futons setup. Submit a photo and we may feature it in our community gallery.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default async function GallerySubmitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.productSlug;
  const productSlug = typeof raw === "string" ? raw : undefined;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="space-y-8">
        <header className="space-y-3">
          <Link
            href="/community-gallery"
            className="inline-flex items-center gap-1 text-sm text-cf-espresso/60 hover:text-cf-espresso"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to gallery
          </Link>
          <h1 className="font-heading text-3xl font-bold text-cf-espresso">
            Share your photo
          </h1>
          <p className="text-base text-cf-espresso/80 leading-relaxed">
            We love seeing Carolina Futons in real homes. Submit a photo and if
            we feature it, we&rsquo;ll link it to the product so others can find it too.
          </p>
        </header>

        <PhotoSubmitForm defaultProductSlug={productSlug} />
      </div>
    </main>
  );
}
