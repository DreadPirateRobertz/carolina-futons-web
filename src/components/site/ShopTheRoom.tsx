import { HeroReveal } from "@/components/motion/HeroReveal";
import { RoomHotspots, type RoomHotspot } from "@/components/room/RoomHotspots";
import { getProductBySlug } from "@/lib/wix/products";

// cf-delight Phase 2: wires the RoomHotspots primitive into a real surface.
// Home page gets a "Shop the room" section between TrustBar and the
// Shop-by-category strip — a lifestyle photo with dot markers on real
// products from the live catalog.
//
// As an async Server Component this resolves the product name + price
// from Wix at request time per slug, so the dots can't lie about pricing
// when Wix marks something on sale or the merchandiser bumps the list
// price. Slugs that 404 in the catalog are dropped + logged so the dot
// never lands on a broken /products/ link.
//
// Hotspot coords are eyeballed from the lifestyle photo composition;
// they need a tuning pass on the preview deploy. cf-delight bead tracks
// follow-up work to let melania position them via CMS.

type HotspotConfig = {
  id: string;
  xPct: number;
  yPct: number;
  productSlug: string;
};

// Murphy cabinet bed lifestyle photo — chosen so the section doesn't
// duplicate HERO_SLIDES[0] (Monterey) which sits a viewport above.
const HERO_PHOTO = {
  src: "https://static.wixstatic.com/media/e04e89_818d75df410a41e1a0721207333bc93d~mv2.jpg/v1/fill/w_1920,h_1080,q_90/file.jpg",
  alt: "Murphy cabinet bed open in a home office, transforming the space",
  width: 1920,
  height: 1080,
} as const;

const HOTSPOT_CONFIGS: ReadonlyArray<HotspotConfig> = [
  { id: "ranchero", xPct: 50, yPct: 55, productSlug: "ranchero-murphy-cabinet-bed" },
  { id: "canby", xPct: 50, yPct: 35, productSlug: "canby-mattress" },
  { id: "solstice", xPct: 78, yPct: 70, productSlug: "solstice-mattress" },
];

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

async function resolveHotspots(): Promise<RoomHotspot[]> {
  const settled = await Promise.all(
    HOTSPOT_CONFIGS.map(async (cfg) => {
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

export async function ShopTheRoom() {
  const hotspots = await resolveHotspots();

  // Hide the section entirely if every product 404'd — better to ship a
  // shorter home page than a 'shop the room' header above an empty image.
  if (hotspots.length === 0) return null;

  return (
    <section
      aria-labelledby="shop-the-room-heading"
      data-slot="shop-the-room"
      className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
    >
      <HeroReveal>
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
              Shop the room
            </p>
            <h2
              id="shop-the-room-heading"
              className="mt-2 font-heading text-2xl font-semibold text-cf-navy sm:text-3xl"
            >
              Tap a piece you like
            </h2>
          </div>
          <p className="hidden max-w-xs text-sm text-cf-muted sm:block">
            Each dot opens a quick view of the product — keyboard-friendly,
            works on touch.
          </p>
        </div>
      </HeroReveal>
      <div className="mt-8">
        <RoomHotspots
          src={HERO_PHOTO.src}
          alt={HERO_PHOTO.alt}
          width={HERO_PHOTO.width}
          height={HERO_PHOTO.height}
          hotspots={hotspots}
        />
      </div>
    </section>
  );
}

// Exported so the unit test can pin the hotspot config + photo invariants
// (in-bounds coords, non-empty slug, no duplicate ids) without touching
// the network. Render-level tests stub getProductBySlug at the import site.
export const __TEST__ = { HOTSPOT_CONFIGS, HERO_PHOTO, resolveHotspots };
