"use client";

import { m, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useRef } from "react";

import { cn } from "@/lib/utils";

// Visual swatch picker for color/finish options. Sibling to VariantPicker.
// Provides a larger hit target, optional color preview, and a Framer-Motion
// morph of the active-state ring as the user moves between swatches.
//
// Motion contract:
//   - Active-ring uses a shared layoutId (`variant-swatch-active-ring-${optionName}`)
//     so Framer animates a single ring element between selected swatches.
//   - layoutId is scoped per option name so two grids on the same PDP don't
//     cross-morph (e.g. Color and Size each get their own ring).
//   - When `useReducedMotion()` reports true the layoutId is dropped — the ring
//     still renders for visual selection but Framer no longer animates its
//     position. WCAG 2.3.3.
//
// Hit target: each swatch is at least 44×44 (`min-h-11 min-w-11`). WCAG 2.5.5.

export type SwatchChoice = {
  value: string;
  description?: string;
  media?: {
    mainMedia?: {
      image?: { url?: string | null } | null;
    } | null;
  } | null;
};

export type VariantSwatchGridProps = {
  optionName: string;
  choices: ReadonlyArray<SwatchChoice>;
  selected: string | undefined;
  onSelect: (value: string) => void;
  isAvailable?: (value: string) => boolean;
  className?: string;
};

export function VariantSwatchGrid({
  optionName,
  choices,
  selected,
  onSelect,
  isAvailable,
  className,
}: VariantSwatchGridProps) {
  const reduce = useReducedMotion() ?? false;
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const enabledIndexes = useMemo(
    () =>
      choices
        .map((c, i) => ({ enabled: isAvailable ? isAvailable(c.value) : true, i }))
        .filter((x) => x.enabled)
        .map((x) => x.i),
    [choices, isAvailable],
  );

  const focusAndSelect = useCallback(
    (index: number) => {
      const target = buttonsRef.current[index];
      target?.focus();
      const value = choices[index]?.value;
      if (value) onSelect(value);
    },
    [choices, onSelect],
  );

  const handleKey = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (enabledIndexes.length === 0) return;
      const pos = enabledIndexes.indexOf(currentIndex);
      let nextPos = pos;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          nextPos = (pos + 1) % enabledIndexes.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          nextPos = (pos - 1 + enabledIndexes.length) % enabledIndexes.length;
          break;
        case "Home":
          nextPos = 0;
          break;
        case "End":
          nextPos = enabledIndexes.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      focusAndSelect(enabledIndexes[nextPos]);
    },
    [enabledIndexes, focusAndSelect],
  );

  return (
    <div
      role="group"
      aria-label={optionName}
      data-slot="variant-swatch-grid"
      data-option-name={optionName}
      className={cn("flex flex-wrap gap-3", className)}
    >
      {choices.map((choice, i) => {
        const value = choice.value;
        const available = isAvailable ? isAvailable(value) : true;
        const isSelected = selected === value;
        const previewUrl = choice.media?.mainMedia?.image?.url ?? null;
        return (
          <m.button
            key={value}
            ref={(el) => {
              buttonsRef.current[i] = el;
            }}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${optionName}: ${value}${available ? "" : " (unavailable)"}`}
            data-selected={isSelected ? "true" : "false"}
            data-value={value}
            tabIndex={
              i ===
              (enabledIndexes.find((idx) => choices[idx].value === selected) ??
                enabledIndexes[0])
                ? 0
                : -1
            }
            disabled={!available}
            onClick={() => available && onSelect(value)}
            onKeyDown={(e) => handleKey(e, i)}
            whileHover={reduce || !available ? undefined : { y: -2 }}
            whileTap={reduce || !available ? undefined : { scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={cn(
              "relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2",
              isSelected
                ? "border-cf-cta bg-cf-cream text-cf-espresso"
                : "border-cf-divider bg-cf-cream text-cf-espresso hover:border-cf-cta hover:text-cf-cta",
              !available &&
                "cursor-not-allowed border-dashed text-cf-espresso/40 line-through hover:border-dashed hover:text-cf-espresso/40",
            )}
          >
            {previewUrl ? (
              <span
                aria-hidden
                data-slot="swatch-preview"
                className="inline-block h-5 w-5 rounded-full border border-cf-divider/60 bg-cover bg-center"
                style={{ backgroundImage: `url(${previewUrl})` }}
              />
            ) : null}
            <span>{choice.description || value}</span>
            {isSelected ? (
              <m.span
                aria-hidden
                data-slot="swatch-active-ring"
                data-layout-id={
                  reduce ? null : `variant-swatch-active-ring-${optionName}`
                }
                {...(reduce
                  ? {}
                  : { layoutId: `variant-swatch-active-ring-${optionName}` })}
                className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-cf-cta"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            ) : null}
          </m.button>
        );
      })}
    </div>
  );
}
