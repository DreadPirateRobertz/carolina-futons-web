import Image from "next/image";

import { getSiteContent } from "@/lib/cms/site-content";
import { getOwnerSession } from "@/lib/auth/owner";
import { resolveWixMediaUrl } from "@/lib/wix/media";

import { EditableImageReplacer } from "./EditableImageReplacer";

// cfw-6qd.6: server-component wrapper around an owner-editable image.
//
// Customer mode: renders a single <Image> at byte-for-byte parity with
// today's hand-rolled call. No editor JS, no `data-editable-image` attr,
// no overlay markup — visiting the site as a non-owner produces the same
// HTML it does today.
//
// Owner mode: wraps the <Image> in a relative-positioned span and mounts
// the EditableImageReplacer client component for the upload affordance.
// Customer renders ship zero replacer JS — the import only enters the
// graph when getOwnerSession() resolves an owner session.
//
// SiteContent contract: `value` for image keys is either a fully-qualified
// https://static.wixstatic.com/media/<...> CDN URL OR a `wix:image://v1/...`
// reference. Both shapes resolve through resolveWixMediaUrl(). When the row
// is missing or unresolvable, the component falls back to `fallbackSrc` —
// owner-mode still shows Replace so Brenda can supply the first image.

export type EditableImageProps = {
  /** SiteContent dotted-path key, e.g. "hero.image". */
  contentKey: string;
  /** Static URL rendered when SiteContent has no row or the value can't resolve. */
  fallbackSrc: string;
  /** Required a11y. Edit alt via a separate text key, not from the UI. */
  alt: string;
  /** Layout reservation. Required when not `priority`. */
  width?: number;
  /** Layout reservation. */
  height?: number;
  /** Forwarded to `next/image` for above-the-fold images. */
  priority?: boolean;
  /** className forwarded to the rendered <Image>. */
  className?: string;
  /** Forwarded to <Image>'s sizes. */
  sizes?: string;
  /** File-picker `accept` hint. Display only — server validates. */
  acceptHint?: string;
  /** Client-side fail-fast cap. Display only — server enforces. */
  maxBytes?: number;
};

const DEFAULT_ACCEPT_HINT = "image/jpeg, image/png, image/webp";
const DEFAULT_MAX_BYTES = 5_000_000;

export async function EditableImage({
  contentKey,
  fallbackSrc,
  alt,
  width,
  height,
  priority,
  className,
  sizes,
  acceptHint = DEFAULT_ACCEPT_HINT,
  maxBytes = DEFAULT_MAX_BYTES,
}: EditableImageProps) {
  // Resolve SiteContent + owner session in parallel — both are async
  // server-side reads with no cross-dependency.
  const [rawValue, owner] = await Promise.all([
    getSiteContent(contentKey, ""),
    getOwnerSession(),
  ]);

  const resolved = resolveWixMediaUrl(rawValue) ?? fallbackSrc;

  // next/image requires width/height OR fill+sizes. Width/height are
  // provided by the caller for owner-editable banners — they're known at
  // design time. Pass them through unchanged.
  const img = (
    <Image
      src={resolved}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      sizes={sizes}
      className={className}
    />
  );

  if (!owner) return img;

  return (
    <span
      data-editable-image={contentKey}
      data-owner-mode="1"
      className="cf-editable-image group relative inline-block"
    >
      {img}
      <EditableImageReplacer
        contentKey={contentKey}
        currentValue={rawValue}
        alt={alt}
        acceptHint={acceptHint}
        maxBytes={maxBytes}
      />
    </span>
  );
}
