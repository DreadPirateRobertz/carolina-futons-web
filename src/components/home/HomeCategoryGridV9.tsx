import Image from "next/image";
import Link from "next/link";

type CategoryCard = {
  num: string;
  type: string;
  title: string;
  href: string;
  tags: string[];
  featured: string;
  photo: string;
  photoAlt: string;
  animal: string;
  animalAlt: string;
};

const CARDS: CategoryCard[] = [
  {
    num: "01",
    type: "Cabinet Beds",
    title: "Murphy Cabinet Beds",
    href: "/shop/murphy-cabinet-beds",
    tags: ["Twin", "Full", "Queen", "Soft-Close"],
    featured: "Ranchero",
    photo: "https://static.wixstatic.com/media/e04e89_00aa9b1d12114969b32e8e982d9bf5c2~mv2.png/v1/fill/w_980,h_654,al_c,q_90/Ranchero.png",
    photoAlt: "Ranchero Murphy Cabinet Bed",
    animal: "/design/animals/woodpecker.jpg",
    animalAlt: "Woodpecker",
  },
  {
    num: "02",
    type: "Futon Frames",
    title: "Futon Frames",
    href: "/shop/futon-frames",
    tags: ["Twin", "Full", "Queen", "Solid Hardwood"],
    featured: "Northern Exposure",
    photo: "https://static.wixstatic.com/media/e04e89_3b67f1efbfda401989e5af8354d8f0a2~mv2.jpg/v1/fill/w_980,h_653,al_c,q_90/Northern_Exposure.jpg",
    photoAlt: "Northern Exposure Futon Frame",
    animal: "/design/animals/raccoon.jpg",
    animalAlt: "Raccoon",
  },
  {
    num: "03",
    type: "Mattresses",
    title: "Mattresses",
    href: "/shop/mattresses",
    tags: ["Twin", "Full", "Queen", "King", "High-Density Foam"],
    featured: "Mountainaire Mattress",
    photo: "https://static.wixstatic.com/media/e04e89_55ecd0dfe1d5498b8a3f8cb583d5089b~mv2.jpg/v1/fill/w_980,h_653,al_c,q_90/file.jpg",
    photoAlt: "Carolina Futons mattress",
    animal: "/design/animals/turkey.jpg",
    animalAlt: "Wild turkey",
  },
  {
    num: "04",
    type: "Platform Beds",
    title: "Platform Beds",
    href: "/shop/platform-beds",
    tags: ["Solid Hardwood", "Low-Profile"],
    featured: "Charleston",
    photo: "https://static.wixstatic.com/media/e04e89_f010f958f7844c9c83a051312637d02f~mv2.jpg/v1/fill/w_980,h_720,al_c,q_90/Charleston.jpg",
    photoAlt: "Charleston Platform Bed",
    animal: "/design/animals/hawk.jpg",
    animalAlt: "Hawk",
  },
];

export function HomeCategoryGridV9() {
  return (
    <section
      aria-labelledby="category-grid-heading"
      className="w-full bg-[#F5F0EA] px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="mb-10 max-w-2xl">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-8 bg-cf-cta" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cf-cta">
              Shop the Workshop
            </span>
          </div>
          <h2
            id="category-grid-heading"
            className="font-heading text-4xl font-bold leading-tight tracking-tight text-cf-espresso sm:text-5xl"
          >
            Four ways to sleep,{" "}
            <em className="not-italic text-cf-cta" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>
              each named for a neighbor.
            </em>
          </h2>
          <p className="mt-4 text-base text-cf-charcoal/70">
            Every category is built around how it actually gets used — Murphy cabinets
            that disappear by day, futon frames that flip in three seconds, mattresses
            you&rsquo;d build a room around, and platform beds that don&rsquo;t need box springs for support.
          </p>
        </div>

        {/* 4-column card grid */}
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((card, index) => (
            <li key={card.num}>
              <Link
                href={card.href}
                data-slot="category-card"
                aria-label={card.title}
                className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
              >
                {/* Background product photo. cf-mu05 F1: priority hint on
                    the LCP card only (index 0 — leftmost above-fold tile).
                    web.dev guidance: one priority Image per page;
                    broadcasting priority across all 4 cards splits fetch
                    budget across non-LCP images and hurts LCP. */}
                <Image
                  src={card.photo}
                  alt={card.photoAlt}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  priority={index === 0}
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />

                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

                {/* Featured chip — top */}
                <div className="absolute left-0 right-0 top-4 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-cf-cta" aria-hidden="true" />
                    Featured · {card.featured}
                  </span>
                </div>

                {/* Animal medallion — center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={[
                      "relative h-[88px] w-[88px] overflow-hidden rounded-full border-2 border-white/30 shadow-xl",
                      card.num === "01" ? "anim-peck" : "anim-tilt",
                    ].join(" ")}
                  >
                    <Image
                      src={card.animal}
                      alt={card.animalAlt}
                      fill
                      sizes="88px"
                      className="object-cover"
                    />
                  </div>
                </div>

                {/* Card footer — bottom */}
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.15em] text-white/50">
                    {card.num} — {card.type}
                  </p>
                  <h3 className="font-heading text-2xl font-bold leading-tight text-white">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-[11px] uppercase tracking-widest text-white/50">
                    {card.tags.join(" · ")}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
