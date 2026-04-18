import Link from "next/link";
import { SHOP_CATEGORIES } from "@/lib/shop/categories";

export default function HomePage() {
  return (
    <>
      <section className="bg-cf-cream">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24 lg:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cf-cta">
              Family owned since 1991
            </p>
            <h1 className="mt-4 font-heading text-4xl font-semibold leading-tight tracking-tight text-cf-navy sm:text-5xl">
              American-made futons, Murphy beds, and mattresses.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-cf-charcoal/80">
              Hendersonville, NC. Hardwood frames built by hand, mattresses we
              actually sleep on, and shipping that shows up.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-flex h-12 items-center justify-center rounded-md bg-cf-cta px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Shop everything
              </Link>
              <Link
                href="/shop/futon-frames"
                className="inline-flex h-12 items-center justify-center rounded-md border border-cf-navy px-6 text-sm font-medium text-cf-navy transition-colors hover:bg-cf-navy hover:text-cf-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Browse futons
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-cf-divider bg-white p-8 shadow-sm">
            <dl className="grid grid-cols-2 gap-6">
              {HERO_STATS.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs font-medium uppercase tracking-wider text-cf-charcoal/60">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 font-heading text-2xl font-semibold text-cf-navy">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <h2 className="font-heading text-2xl font-semibold text-cf-navy sm:text-3xl">
            Shop by category
          </h2>
          <Link
            href="/shop"
            className="text-sm font-medium text-cf-cta hover:underline"
          >
            View all →
          </Link>
        </div>
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHOP_CATEGORIES.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/shop/${category.slug}`}
                className="group flex h-full flex-col justify-between rounded-lg border border-cf-divider bg-white p-6 transition-colors hover:border-cf-navy"
              >
                <div>
                  <h3 className="font-heading text-lg font-semibold text-cf-navy">
                    {category.name}
                  </h3>
                  <p className="mt-2 text-sm text-cf-charcoal/80">
                    {category.description}
                  </p>
                </div>
                <span className="mt-6 text-sm font-medium text-cf-cta group-hover:underline">
                  Browse {category.name.toLowerCase()} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-cf-divider bg-cf-sand/40">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 sm:grid-cols-3 sm:px-6 lg:px-8">
          {VALUE_PROPS.map((prop) => (
            <div key={prop.title}>
              <h3 className="font-heading text-base font-semibold text-cf-navy">
                {prop.title}
              </h3>
              <p className="mt-2 text-sm text-cf-charcoal/80">
                {prop.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

const HERO_STATS = [
  { label: "Years in business", value: "35+" },
  { label: "Frames built in", value: "North Carolina" },
  { label: "Ships in", value: "1–2 weeks" },
  { label: "Showroom", value: "Hendersonville, NC" },
];

const VALUE_PROPS = [
  {
    title: "Hardwood, not plywood",
    body: "Frames milled from solid oak, maple, and cherry. Built to outlive the apartment they ship to.",
  },
  {
    title: "Sleep on it first",
    body: "Visit the Hendersonville showroom and try every mattress we sell. No commission pressure.",
  },
  {
    title: "White-glove delivery",
    body: "Regional delivery teams set it up where you want it. Not on a curb in a box.",
  },
];
