// Home-page trust bar — five at-a-glance value props rendered between the
// hero section and the Shop-by-category grid. Dark navy surface intentionally
// mirrors the AnnouncementBar so the top of the home page reads as one
// "brand promises" band. Emoji glyphs are decorative (aria-hidden) — the
// text label is the accessible name, not the icon.

type TrustItem = {
  icon: string;
  label: string;
};

export const TRUST_BAR_ITEMS: ReadonlyArray<TrustItem> = [
  { icon: "🚚", label: "Free White-Glove Delivery" },
  { icon: "⭐", label: "Handcrafted in NC" },
  { icon: "💰", label: "0% APR Financing" },
  { icon: "🎨", label: "Free Swatch Kit" },
  { icon: "✓", label: "Satisfaction Guarantee" },
];

export function TrustBar() {
  return (
    <section
      data-testid="trust-bar"
      data-slot="trust-bar"
      role="region"
      aria-label="Why Carolina Futons"
      className="bg-cf-navy text-cf-cream"
    >
      <ul
        data-testid="trust-bar-list"
        className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-5 sm:gap-6 sm:px-6 lg:px-8"
      >
        {TRUST_BAR_ITEMS.map((item) => (
          <li
            key={item.label}
            data-testid="trust-bar-item"
            className="flex items-center justify-center gap-2 text-center text-sm font-medium"
          >
            <span
              data-testid="trust-bar-icon"
              aria-hidden="true"
              className="text-base"
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
