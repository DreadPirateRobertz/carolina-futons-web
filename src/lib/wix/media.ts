// cfw-6qd.6: resolver for Wix Media references stored in the SiteContent
// collection. Owner-editable image keys carry one of two value shapes:
//
//   1. https://static.wixstatic.com/media/<...> — a fully-resolved CDN URL.
//      These are what cfw-roi's seed inserts and what the upload endpoint
//      writes when Wix returns the canonical CDN URL alongside the media id.
//
//   2. wix:image://v1/<hash-with-ext>/<filename>#originWidth=<w>&originHeight=<h>
//      — Wix's internal media reference scheme. The hash carries the file
//      extension (e.g. "abc123~mv2.jpg"), the path's last segment is the
//      original filename, and the fragment carries the source dimensions.
//
// `resolveWixMediaUrl` collapses both into a stable CDN URL, or returns null
// when the input isn't usable (empty / malformed / unrecognised). Callers
// pair it with a static `fallbackSrc` so a broken row never breaks the page.
//
// This stays deliberately client-side-safe (pure string transform, no SDK
// import) so server components and tests can call it without a Wix client
// context. The Wix Media SDK has a richer download-URL API for signed
// assets, which can land in a follow-up if we ever need private images;
// public storefront photos all live on the public CDN.

const WIX_MEDIA_HOST_URL = "https://static.wixstatic.com/media";

export function resolveWixMediaUrl(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  // Already a CDN URL — pass through. Tightened to the public Wix media host
  // so a stray "https://example.com/foo.jpg" doesn't sneak into an image
  // key's value via SiteContent.
  if (trimmed.startsWith(WIX_MEDIA_HOST_URL)) return trimmed;

  // wix:image://v1/<hash>/<filename> with optional #fragment for dimensions.
  if (trimmed.startsWith("wix:image://v1/")) {
    return parseWixImageRef(trimmed);
  }

  return null;
}

function parseWixImageRef(ref: string): string | null {
  // Strip the scheme + version prefix.
  const afterPrefix = ref.slice("wix:image://v1/".length);
  if (afterPrefix.length === 0) return null;

  // Split off the fragment (#originWidth=…&originHeight=…) if present. Drop
  // the query string the same way — the storefront CDN URL doesn't carry it.
  const hashIdx = afterPrefix.indexOf("#");
  const queryIdx = afterPrefix.indexOf("?");
  const cutIdx =
    hashIdx === -1
      ? queryIdx
      : queryIdx === -1
        ? hashIdx
        : Math.min(hashIdx, queryIdx);
  const path = cutIdx === -1 ? afterPrefix : afterPrefix.slice(0, cutIdx);
  const fragment = hashIdx === -1 ? "" : afterPrefix.slice(hashIdx + 1);

  const segments = path.split("/").filter((s) => s.length > 0);
  if (segments.length < 2) return null;

  const hash = segments[0];
  const filename = segments[segments.length - 1];
  if (!hash || !filename) return null;

  // originWidth / originHeight come from the fragment as URL-encoded
  // form-style params (Wix uses # not ? to keep the string opaque to query
  // serializers). Optional — when missing we synthesize a /v1/fit/<...>
  // segment without explicit dimensions.
  const dims = parseFragmentDims(fragment);

  if (dims) {
    return `${WIX_MEDIA_HOST_URL}/${hash}/v1/fill/w_${dims.w},h_${dims.h}/${filename}`;
  }
  // No dimension hint. Fall back to a /file.<ext> path that lets the CDN
  // serve the source asset; consumers can chain wixImageUrl() on top to
  // request a constrained render size.
  return `${WIX_MEDIA_HOST_URL}/${hash}/${filename}`;
}

function parseFragmentDims(fragment: string): { w: number; h: number } | null {
  if (!fragment) return null;
  const params = new URLSearchParams(fragment);
  const w = Number(params.get("originWidth"));
  const h = Number(params.get("originHeight"));
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
  if (w <= 0 || h <= 0) return null;
  return { w: Math.round(w), h: Math.round(h) };
}
