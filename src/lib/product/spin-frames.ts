// cfw-x3w: extract 360°-spin frames from a Wix product's media.items[] list.
// Convention: a spin frame is any image whose title (or alt text) starts with
// the prefix "spin" followed by an index — e.g. "spin-001", "spin 1",
// "spin_01". Frames are returned sorted by parsed numeric index.
//
// `threshold` is the minimum number of frames required for the spin viewer to
// be considered viable. The bead mandates 12+ for the gallery toggle so that a
// product with two stray "spin"-named images doesn't get a glitchy rotator.
import type { GalleryMediaItem } from "@/lib/product/variant-selection";

const SPIN_FRAME_RE = /^spin[\s_-]?(\d+)/i;

export function extractSpinFrames(
  mediaItems: ReadonlyArray<GalleryMediaItem> | undefined,
  threshold = 12,
): string[] {
  if (!mediaItems || mediaItems.length === 0) return [];
  const frames: { index: number; url: string }[] = [];
  for (const item of mediaItems) {
    if (item?.mediaType && item.mediaType.toLowerCase() !== "image") continue;
    const url = item?.image?.url;
    if (!url) continue;
    const title = item?.title ?? "";
    const altText = item?.image?.altText ?? "";
    const match = title.match(SPIN_FRAME_RE) ?? altText.match(SPIN_FRAME_RE);
    if (!match) continue;
    frames.push({ index: parseInt(match[1], 10), url });
  }
  if (frames.length < threshold) return [];
  frames.sort((a, b) => a.index - b.index);
  return frames.map((f) => f.url);
}
