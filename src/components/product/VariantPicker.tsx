"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  findMatchingVariant,
  getSelectedPrice,
  initialSelection,
  isChoiceAvailable,
  isVariantInStock,
  type ChoiceSelection,
  type ProductOptionInput,
  type VariantInput,
} from "@/lib/product/variant-selection";

export type VariantPickerProps = {
  productOptions: ReadonlyArray<ProductOptionInput>;
  variants: ReadonlyArray<VariantInput>;
  fallbackPrice: string;
  onSelectionChange?: (selection: ChoiceSelection, variant: VariantInput | null) => void;
};

export function VariantPicker({
  productOptions,
  variants,
  fallbackPrice,
  onSelectionChange,
}: VariantPickerProps) {
  const [selection, setSelection] = useState<ChoiceSelection>(() =>
    initialSelection(productOptions, variants),
  );

  const currentVariant = useMemo(
    () => findMatchingVariant(variants, selection),
    [variants, selection],
  );
  const currentPrice = useMemo(
    () => getSelectedPrice(variants, selection, fallbackPrice),
    [variants, selection, fallbackPrice],
  );
  const currentInStock = currentVariant ? isVariantInStock(currentVariant) : null;

  const selectChoice = useCallback(
    (optionName: string, value: string) => {
      setSelection((prev) => {
        const next = { ...prev, [optionName]: value };
        const variant = findMatchingVariant(variants, next);
        onSelectionChange?.(next, variant);
        return next;
      });
    },
    [variants, onSelectionChange],
  );

  if (productOptions.length === 0) {
    return (
      <div data-slot="variant-picker" className="space-y-4">
        <PriceDisplay price={currentPrice} inStock={currentInStock} />
      </div>
    );
  }

  return (
    <div data-slot="variant-picker" className="space-y-5">
      {productOptions.map((option) => (
        <OptionGroup
          key={option.name ?? "option"}
          option={option}
          variants={variants}
          selection={selection}
          onSelect={selectChoice}
        />
      ))}
      <PriceDisplay price={currentPrice} inStock={currentInStock} />
    </div>
  );
}

function PriceDisplay({
  price,
  inStock,
}: {
  price: string;
  inStock: boolean | null;
}) {
  return (
    <div className="flex items-center gap-3" data-slot="variant-picker-price">
      <p
        className="text-2xl font-medium text-cf-espresso"
        aria-live="polite"
        data-testid="variant-price"
      >
        {price}
      </p>
      {inStock === false ? (
        <span
          className="inline-flex items-center rounded-full border border-cf-error/30 bg-cf-error/10 px-2 py-0.5 text-xs font-medium text-cf-error"
          role="status"
        >
          Out of stock
        </span>
      ) : null}
    </div>
  );
}

function OptionGroup({
  option,
  variants,
  selection,
  onSelect,
}: {
  option: ProductOptionInput;
  variants: ReadonlyArray<VariantInput>;
  selection: ChoiceSelection;
  onSelect: (optionName: string, value: string) => void;
}) {
  const name = option.name ?? "";
  const choices = useMemo(() => option.choices ?? [], [option.choices]);
  const labelId = `variant-option-${slugify(name)}`;
  const selectedValue = selection[name];
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKey = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const enabledIndexes = choices
        .map((c, i) => ({ enabled: c.value ? isChoiceAvailable(variants, name, c.value, selection) : false, i }))
        .filter((x) => x.enabled)
        .map((x) => x.i);
      if (enabledIndexes.length === 0) return;
      const currentPos = enabledIndexes.indexOf(index);
      let targetPos = currentPos;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        targetPos = currentPos === -1 ? 0 : (currentPos + 1) % enabledIndexes.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        targetPos =
          currentPos === -1
            ? enabledIndexes.length - 1
            : (currentPos - 1 + enabledIndexes.length) % enabledIndexes.length;
      } else if (event.key === "Home") {
        targetPos = 0;
      } else if (event.key === "End") {
        targetPos = enabledIndexes.length - 1;
      } else {
        return;
      }
      event.preventDefault();
      const targetIndex = enabledIndexes[targetPos];
      const target = buttonsRef.current[targetIndex];
      target?.focus();
      const targetValue = choices[targetIndex]?.value;
      if (targetValue) onSelect(name, targetValue);
    },
    [choices, variants, selection, name, onSelect],
  );

  return (
    <fieldset
      data-slot="variant-option"
      data-option-name={name}
      className="space-y-2"
    >
      <legend
        id={labelId}
        className="flex items-center gap-2 text-sm font-medium text-cf-espresso"
      >
        <span>{name}</span>
        {selectedValue ? (
          <span className="text-cf-espresso/60">· {selectedValue}</span>
        ) : null}
      </legend>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex flex-wrap gap-2"
      >
        {choices.map((choice, i) => {
          const value = choice.value ?? "";
          const available = value
            ? isChoiceAvailable(variants, name, value, selection)
            : false;
          const selected = selectedValue === value;
          return (
            <button
              key={value || i}
              ref={(el) => {
                buttonsRef.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${name}: ${value}${available ? "" : " (out of stock)"}`}
              data-selected={selected ? "true" : "false"}
              data-available={available ? "true" : "false"}
              tabIndex={selected || (!selectedValue && i === 0) ? 0 : -1}
              disabled={!available}
              onClick={() => value && onSelect(name, value)}
              onKeyDown={(e) => handleKey(e, i)}
              className={cn(
                "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2",
                selected
                  ? "border-cf-cta bg-cf-cta text-white"
                  : "border-cf-divider bg-cf-cream text-cf-espresso hover:border-cf-cta hover:text-cf-cta",
                !available &&
                  "cursor-not-allowed border-dashed text-cf-espresso/40 hover:border-dashed hover:text-cf-espresso/40 line-through",
              )}
            >
              {choice.description || value || "—"}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unnamed";
}
