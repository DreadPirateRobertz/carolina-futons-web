import * as Sentry from "@sentry/nextjs";

import { HeroReveal } from "@/components/motion/HeroReveal";
import { RoomHotspots, type RoomHotspot } from "@/components/room/RoomHotspots";
import { getProductBySlug } from "@/lib/wix/products";

// cf-delight: configurable "Shop the room" section that wires RoomHotspots
// into a real surface. Each surface (Home, /about, /shop) supplies its
// own lifestyle photo + hotspot config; the section resolves product
// name + price from Wix per slug at request time so the dots can't lie
// about pricing or PDP availability.
//
// Heading + lede default to the home-page copy and can be overridden per
// surface (e.g. /about uses "See it in a real bedroom").

export type HotspotConfig = {
  id: string;
  xPct: number;
  yPct: number;
  productSlug: string;
};

export type HeroPhoto = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type ShopTheRoomProps = {
  // Stable id for the heading; multiple instances on the same page would
  // collide otherwise. Default keeps the home-page contract intact.
  headingId?: string;
  eyebrow?: string;
  heading?: string;
  lede?: string;
  heroPhoto: HeroPhoto;
  hotspotConfigs: ReadonlyArray<HotspotConfig>;
};

// Pull list price from the Wix product envelope and format it for the
// popover. Returns null when the product has no usable price (variant-
// priced products with priceData.price=0, or transient Wix outages).
function formatProductPrice(
  product: Awaited<ReturnType<typeof getProductBySlug>>,
): string | null {
  if (!product) return null;
  const formatted = product.priceData?.formatted?.price;
  if (formatted && typeof formatted === "string") return formatted;
  const numeric = product.priceData?.price;
  if (typeof numeric === "number" && numeric > 0) {
    return `$${numeric.toFixed(2)}`;
  }
  return null;
}

export async function resolveHotspots(
  configs: ReadonlyArray<HotspotConfig>,
): Promise<RoomHotspot[]> {
  const settled = await Promise.all(
    configs.map(async (cfg) => {
      const product = await getProductBySlug(cfg.productSlug);
      if (!product) {
        // getProductBySlug only logs SDK errors via logWixFailure — a
        // null return for a missing-or-renamed slug surfaces silently.
        // Surface to Sentry here so a catalog rename doesn't quietly
        // remove a dot for weeks before someone notices.
        Sentry.captureMessage(
          `[ShopTheRoom] dropping hotspot ${cfg.id}: getProductBySlug(${cfg.productSlug}) returned null`,
          { level: "warning" },
        );
        return null;
      }
      const price = formatProductPrice(product);
      if (!price) {
        // Variant-priced products + transient Wix glitches end up here.
        // Sentry rather than console.warn — Vercel stdout is not
        // monitored, so a console-only drop is invisible in prod.
        Sentry.captureMessage(
          `[ShopTheRoom] dropping hotspot ${cfg.id}: ${cfg.productSlug} has no list price`,
          { level: "warning" },
        );
        return null;
      }
      return {
        id: cfg.id,
        xPct: cfg.xPct,
        yPct: cfg.yPct,
        productSlug: cfg.productSlug,
        productName: product.name ?? cfg.productSlug,
        formattedPrice: price,
      } satisfies RoomHotspot;
    }),
  );
  return settled.filter((s): s is RoomHotspot => s !== null);
}

// ── Per-surface configs ─────────────────────────────────────────────────────
//
// All photos are pulled from the SHOP_CATEGORIES card images
// (lib/shop/categories.ts) at full lifestyle resolution. Category card
// assets are deliberately distinct from HERO_SLIDES so the home-page
// carousel can't re-show whichever scene the home ShopTheRoom is using
// (caught in code review: HOME_HERO_PHOTO previously dup'd HERO_SLIDES[2]).
//
// LIFESTYLE_FUTON_FRAMES_PHOTO is shared between HOME and the
// /shop/futon-frames PLP. A visitor going home → "Browse futons" → PLP
// will see the same scene twice across two pages — different pages,
// different products tagged. Acceptable cross-page repeat; the
// alternative was tagging the PLP with a non-futon photo.

const LIFESTYLE_FUTON_FRAMES_PHOTO: HeroPhoto = {
  src: "https://static.wixstatic.com/media/e04e89_4bea49a709a3470a8315b5acd7309b0f~mv2.jpg/v1/fill/w_1920,h_1080,q_90/file.jpg",
  alt: "Sunlit living room with a hardwood futon frame and natural mattress",
  width: 1920,
  height: 1080,
} as const;

export const HOME_HERO_PHOTO: HeroPhoto = LIFESTYLE_FUTON_FRAMES_PHOTO;

export const HOME_HOTSPOT_CONFIGS: ReadonlyArray<HotspotConfig> = [
  { id: "monterey", xPct: 38, yPct: 70, productSlug: "monterey-futon-frame" },
  { id: "kingston", xPct: 60, yPct: 65, productSlug: "kingston-futon-frame" },
  { id: "canby", xPct: 50, yPct: 55, productSlug: "canby-futon-frame" },
];

export const ABOUT_HERO_PHOTO: HeroPhoto = {
  src: "https://static.wixstatic.com/media/e04e89_8cd0de059f244e8485a600d4783caa92~mv2.jpg/v1/fill/w_1920,h_1080,q_90/file.jpg",
  alt: "Hardwood platform bed in a calm bedroom with natural light",
  width: 1920,
  height: 1080,
} as const;

export const ABOUT_HOTSPOT_CONFIGS: ReadonlyArray<HotspotConfig> = [
  { id: "charleston", xPct: 50, yPct: 65, productSlug: "charleston-platform-bed" },
  { id: "nutmeg", xPct: 30, yPct: 70, productSlug: "nutmeg-platform-bed" },
  { id: "portofino", xPct: 50, yPct: 45, productSlug: "portofino" },
];

export const SHOP_HERO_PHOTO: HeroPhoto = {
  src: "https://static.wixstatic.com/media/e04e89_55ecd0dfe1d5498b8a3f8cb583d5089b~mv2.jpg/v1/fill/w_1920,h_1080,q_90/file.jpg",
  alt: "Stack of natural mattresses in a bright showroom",
  width: 1920,
  height: 1080,
} as const;

export const SHOP_HOTSPOT_CONFIGS: ReadonlyArray<HotspotConfig> = [
  { id: "haley", xPct: 50, yPct: 50, productSlug: "haley-110" },
  { id: "moonshadow", xPct: 30, yPct: 60, productSlug: "pulsar" },
  { id: "canby-shop", xPct: 70, yPct: 60, productSlug: "canby-futon-frame" },
];

// /shop/futon-frames PLP. Reuses the shared LIFESTYLE_FUTON_FRAMES_PHOTO
// (same asset as HOME_HERO_PHOTO) — a single source of truth for the
// futon-room scene. Hotspot products are all real futon SKUs verified
// live on prod (canby-mattress was flagged stale in review and dropped
// in favor of ekko-futon-frame).
export const FUTON_FRAMES_PLP_HERO_PHOTO: HeroPhoto = LIFESTYLE_FUTON_FRAMES_PHOTO;

export const FUTON_FRAMES_PLP_HOTSPOT_CONFIGS: ReadonlyArray<HotspotConfig> = [
  { id: "monterey-plp", xPct: 38, yPct: 70, productSlug: "monterey-futon-frame" },
  { id: "kingston-plp", xPct: 60, yPct: 65, productSlug: "kingston-futon-frame" },
  { id: "ekko-plp", xPct: 50, yPct: 55, productSlug: "ekko-futon-frame" },
];

// /shop/murphy-cabinet-beds PLP. Home-office lifestyle scene showing a
// murphy cabinet bed open, demonstrating the space-saving transformation.
// Slugs: asheville-murphy-bed and cube-murphy-cabinet-bed are confirmed in
// fixtures/videos catalog. ranchero-murphy-cabinet-bed is a Night & Day SKU
// present in the pre-existing test fixture — verify it exists in the live
// Wix catalog before merging. ShopTheRoom drops any slug that 404s at
// request time, so a missing slug degrades to 2 dots rather than crashing.
export const MURPHY_BEDS_PLP_HERO_PHOTO: HeroPhoto = {
  src: "https://static.wixstatic.com/media/e04e89_818d75df410a41e1a0721207333bc93d~mv2.jpg/v1/fill/w_1920,h_1080,q_90/file.jpg",
  alt: "Murphy cabinet bed open in a home office, transforming the space",
  width: 1920,
  height: 1080,
} as const;

export const MURPHY_BEDS_PLP_HOTSPOT_CONFIGS: ReadonlyArray<HotspotConfig> = [
  { id: "asheville-murphy-plp", xPct: 45, yPct: 50, productSlug: "asheville-murphy-bed" },
  { id: "cube-murphy-plp", xPct: 65, yPct: 55, productSlug: "cube-murphy-cabinet-bed" },
  { id: "ranchero-murphy-plp", xPct: 30, yPct: 60, productSlug: "ranchero-murphy-cabinet-bed" },
];

// ── PLP gating ──────────────────────────────────────────────────────────────
//
// Map from PLP category slug → ShopTheRoom props. The PLP page reads
// from this lookup rather than string-matching, so a typo on the consumer
// side returns undefined (no section, no crash) and adding a new PLP is
// one entry here.

export const PLP_SHOP_THE_ROOM_CONFIGS: Readonly<
  Record<string, ShopTheRoomProps>
> = {
  "futon-frames": {
    headingId: "plp-futon-frames-shop-the-room-heading",
    eyebrow: "Shop the room",
    heading: "See the futons in a room",
    heroPhoto: FUTON_FRAMES_PLP_HERO_PHOTO,
    hotspotConfigs: FUTON_FRAMES_PLP_HOTSPOT_CONFIGS,
  },
  "murphy-cabinet-beds": {
    headingId: "plp-murphy-beds-shop-the-room-heading",
    eyebrow: "Shop the room",
    heading: "See the cabinet bed in a room",
    heroPhoto: MURPHY_BEDS_PLP_HERO_PHOTO,
    hotspotConfigs: MURPHY_BEDS_PLP_HOTSPOT_CONFIGS,
  },
};

// ── Component ──────────────────────────────────────────────────────────────

export async function ShopTheRoom({
  headingId = "shop-the-room-heading",
  eyebrow = "Shop the room",
  heading = "Tap a piece you like",
  lede = "Each dot opens a quick view of the product — keyboard-friendly, works on touch.",
  heroPhoto,
  hotspotConfigs,
}: ShopTheRoomProps) {
  const hotspots = await resolveHotspots(hotspotConfigs);

  // Hide the section entirely if every product 404'd — better to ship a
  // shorter page than a 'shop the room' header above an empty image.
  if (hotspots.length === 0) return null;

  return (
    <section
      aria-labelledby={headingId}
      data-slot="shop-the-room"
      className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
    >
      <HeroReveal>
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
              {eyebrow}
            </p>
            <h2
              id={headingId}
              className="mt-2 font-heading text-2xl font-semibold text-cf-navy sm:text-3xl"
            >
              {heading}
            </h2>
          </div>
          <p className="hidden max-w-xs text-sm text-cf-muted sm:block">
            {lede}
          </p>
        </div>
      </HeroReveal>
      <div className="mt-8">
        <RoomHotspots
          src={heroPhoto.src}
          alt={heroPhoto.alt}
          width={heroPhoto.width}
          height={heroPhoto.height}
          hotspots={hotspots}
        />
      </div>
    </section>
  );
}

// Exported so the unit test can call resolveHotspots without touching
// the network. Per-surface config constants are already public exports
// — tests import them directly rather than through `__TEST__`.
export const __TEST__ = { resolveHotspots };
