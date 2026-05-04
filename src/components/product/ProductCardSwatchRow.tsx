import type { ColorChoice } from "@/lib/product/color-options";

const MAX_VISIBLE_DOTS = 5;

// Renders the "Available in N colors" badge plus up to 5 swatch dots.
// Always visible (no hover-gating) so the badge text is announced to screen
// readers without requiring pointer interaction.
export function ProductCardSwatchRow({
  choices,
}: {
  choices: ReadonlyArray<ColorChoice>;
}) {
  if (choices.length === 0) return null;
  const visibleDots = choices.slice(0, MAX_VISIBLE_DOTS);
  const overflow = choices.length - visibleDots.length;
  const labelText =
    choices.length === 1
      ? "1 color"
      : `Available in ${choices.length} colors`;
  return (
    <div
      data-slot="product-card-swatch-row"
      className="mt-2 flex items-center gap-2"
    >
      <ul
        aria-label={labelText}
        className="flex items-center gap-1"
      >
        {visibleDots.map((c) => (
          <li
            key={c.label}
            data-slot="swatch-dot"
            data-color-label={c.label}
            title={c.label}
            className="h-3.5 w-3.5 rounded-full border border-zinc-300 dark:border-zinc-600"
            style={{ backgroundColor: c.hex ?? undefined }}
          />
        ))}
        {overflow > 0 ? (
          <li
            data-slot="swatch-dot-overflow"
            aria-hidden="true"
            className="ml-0.5 text-xs text-zinc-500 dark:text-zinc-400"
          >
            +{overflow}
          </li>
        ) : null}
      </ul>
      <span className="text-xs text-zinc-600 dark:text-zinc-300">
        {labelText}
      </span>
    </div>
  );
}
