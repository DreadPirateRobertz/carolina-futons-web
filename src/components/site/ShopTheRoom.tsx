import { HeroReveal } from "@/components/motion/HeroReveal";
import { RoomHotspots, type RoomHotspot } from "@/components/room/RoomHotspots";

// cf-delight Phase 2: wire the RoomHotspots primitive into a real surface.
// Home page gets a "Shop the room" section between TrustBar and the
// Shop-by-category strip — a lifestyle photo with 3 dot markers on real
// products from the live catalog.
//
// Hotspot coords are eyeballed from the lifestyle photo composition;
// they'll need a real-eyes tuning pass once the section ships to a
// preview deploy. Easy to adjust without redeploying — just edit the
// xPct/yPct numbers below.
//
// Prices are hardcoded for now to match production. A follow-up bead
// can pull live prices from /api/products or via a server-rendered
// version of this section. Keeping it static today avoids a network
// roundtrip in the home-page critical path while we validate the UX.

const HOME_HERO_HOTSPOTS: ReadonlyArray<RoomHotspot> = [
  {
    id: "monterey-frame",
    xPct: 38,
    yPct: 70,
    productSlug: "monterey-futon-frame",
    productName: "Monterey Futon Frame",
    formattedPrice: "$899.00",
  },
  {
    id: "kingston-frame",
    xPct: 60,
    yPct: 65,
    productSlug: "kingston-futon-frame",
    productName: "Kingston Futon Frame",
    formattedPrice: "$619.00",
  },
  {
    id: "canby-mattress",
    xPct: 50,
    yPct: 55,
    productSlug: "canby-mattress",
    productName: "Canby Mattress",
    formattedPrice: "$737.00",
  },
];

const HERO_PHOTO = {
  src: "https://static.wixstatic.com/media/e04e89_72d82110638045c39e0f6274363c15f8~mv2.jpg/v1/fill/w_1920,h_1080,q_90/file.jpg",
  alt: "Living room scene with hardwood futon frame and natural mattress, sunlight streaming through tall windows",
  width: 1920,
  height: 1080,
};

export function ShopTheRoom() {
  return (
    <section
      aria-labelledby="shop-the-room-heading"
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
          hotspots={HOME_HERO_HOTSPOTS}
        />
      </div>
    </section>
  );
}

// Exported for the unit test (lets the test pin the data shape without
// rendering the whole section + RoomHotspots dance).
export const __TEST__ = { HOME_HERO_HOTSPOTS, HERO_PHOTO };
