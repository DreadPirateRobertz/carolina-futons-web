import { HeroReveal } from "@/components/motion/HeroReveal";
import { RoomHotspots, type RoomHotspot } from "@/components/room/RoomHotspots";
import { getProductBySlug } from "@/lib/wix/products";

// cf-delight Phase 2/3: configurable "Shop the room" section that wires
// RoomHotspots into a real surface. Each surface (Home, /about, /shop)
// supplies its own lifestyle photo + hotspot config; the section
// resolves product name + price from Wix per slug at request time so the
// dots can't lie about pricing or PDP availability.
//
// Heading + lede default to the home-page copy and can be overridden per
// surface (e.g. /about uses "See it in a real bedroom").
//
// Hotspot coords are eyeballed from each photo; expect a tuning pass on
// preview deploys. cf-delight bead tracks follow-up CMS work.

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
        // getProductBySlug already logs to Sentry via logWixFailure.
        // Drop the dot so the section never points at a broken PDP.
        return null;
      }
      const price = formatProductPrice(product);
      if (!price) {
        console.warn(
          `[ShopTheRoom] dropping hotspot ${cfg.id}: ${cfg.productSlug} has no list price`,
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

// Home: Murphy cabinet bed scene. Avoids HERO_SLIDES[0] (Monterey) which
// sits a viewport above in the home carousel.
export const HOME_HERO_PHOTO: HeroPhoto = {
  src: "https://static.wixstatic.com/media/e04e89_818d75df410a41e1a0721207333bc93d~mv2.jpg/v1/fill/w_1920,h_1080,q_90/file.jpg",
  alt: "Murphy cabinet bed open in a home office, transforming the space",
  width: 1920,
  height: 1080,
} as const;

export const HOME_HOTSPOT_CONFIGS: ReadonlyArray<HotspotConfig> = [
  { id: "ranchero", xPct: 50, yPct: 55, productSlug: "ranchero-murphy-cabinet-bed" },
  { id: "canby", xPct: 50, yPct: 35, productSlug: "canby-mattress" },
  { id: "solstice", xPct: 78, yPct: 70, productSlug: "solstice-mattress" },
];

// /about: platform bed coastal bedroom (HERO_SLIDES[1]). Different scene
// than home so the page reads as a distinct moment, not a repeat.
export const ABOUT_HERO_PHOTO: HeroPhoto = {
  src: "https://static.wixstatic.com/media/e04e89_b9d4cf76a1a84bf5bb4821edc53f6df2~mv2.jpg/v1/fill/w_1920,h_1080,q_90/file.jpg",
  alt: "Natural hardwood platform bed in a coastal bedroom with morning light",
  width: 1920,
  height: 1080,
} as const;

export const ABOUT_HOTSPOT_CONFIGS: ReadonlyArray<HotspotConfig> = [
  { id: "charleston", xPct: 50, yPct: 65, productSlug: "charleston-platform-bed" },
  { id: "nutmeg", xPct: 30, yPct: 70, productSlug: "nutmeg-platform-bed" },
  { id: "portofino", xPct: 50, yPct: 45, productSlug: "portofino-mattress" },
];

// /shop: Monterey futon scene (HERO_SLIDES[0]). Safe to use here —
// /shop has no carousel so there's no double-render risk.
export const SHOP_HERO_PHOTO: HeroPhoto = {
  src: "https://static.wixstatic.com/media/e04e89_72d82110638045c39e0f6274363c15f8~mv2.jpg/v1/fill/w_1920,h_1080,q_90/file.jpg",
  alt: "Mission-style hardwood futon in a sunlit living room",
  width: 1920,
  height: 1080,
} as const;

export const SHOP_HOTSPOT_CONFIGS: ReadonlyArray<HotspotConfig> = [
  { id: "monterey", xPct: 38, yPct: 70, productSlug: "monterey-futon-frame" },
  { id: "kingston", xPct: 60, yPct: 65, productSlug: "kingston-futon-frame" },
  { id: "canby-shop", xPct: 50, yPct: 55, productSlug: "canby-mattress" },
];

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

// Exported so the unit test can pin invariants for every surface's
// config (in-bounds coords, non-empty slug, no duplicate ids) without
// touching the network.
export const __TEST__ = {
  HOME_HOTSPOT_CONFIGS,
  HOME_HERO_PHOTO,
  ABOUT_HOTSPOT_CONFIGS,
  ABOUT_HERO_PHOTO,
  SHOP_HOTSPOT_CONFIGS,
  SHOP_HERO_PHOTO,
  resolveHotspots,
};
