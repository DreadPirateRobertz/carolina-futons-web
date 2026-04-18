// Home-page "by the numbers" strip. Three bold stats rendered on the
// cf-navy surface between the Featured products section and the
// testimonials band. Visually louder than the TrustBar (which shares the
// navy surface but uses line-of-text density) — here the number is the
// headline, the label reads as a caption underneath. Data is static: any
// change to these numbers is a marketing decision, not a code-review one,
// so the test suite pins the exact copy to catch silent drift.

type Stat = {
  value: string;
  label: string;
};

export const STATS: ReadonlyArray<Stat> = [
  { value: "35+", label: "Years in business" },
  { value: "1,000+", label: "Happy customers" },
  { value: "15-year", label: "Frame warranty" },
];

export function StatsStrip() {
  return (
    <section
      data-testid="stats-strip"
      role="region"
      aria-label="By the numbers"
      className="bg-cf-navy text-cf-cream"
    >
      <ul
        data-testid="stats-strip-list"
        className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 py-12 text-center sm:grid-cols-3 sm:gap-6 sm:px-6 sm:py-14 lg:px-8"
      >
        {STATS.map((stat) => (
          <li
            key={stat.label}
            data-testid="stat"
            className="flex flex-col items-center"
          >
            <span className="font-heading text-4xl font-bold leading-none text-cf-cream sm:text-5xl">
              {stat.value}
            </span>
            <span className="mt-3 text-sm font-medium uppercase tracking-[0.14em] text-cf-cream/80">
              {stat.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
