// Pure variant-picker logic for Wix Stores v1 products.
// Framework-free so it can be unit-tested without render setup, and reused
// by cf-3qt.2.2 AddToCart + cf-3qt.2.3 Cart Drawer.

export type ProductOptionInput = {
  name?: string | null;
  choices?: ReadonlyArray<{ value?: string | null; description?: string | null }> | null;
};

export type VariantInput = {
  _id?: string | null;
  choices?: Record<string, string> | null;
  variant?: {
    priceData?: { formatted?: { price?: string | null } | null } | null;
  } | null;
  stock?: {
    trackQuantity?: boolean | null;
    inStock?: boolean | null;
    quantity?: number | null;
  } | null;
  media?: {
    mainMedia?: { image?: { url?: string | null } | null } | null;
  } | null;
};

export type ChoiceSelection = Record<string, string>;

export function isVariantInStock(variant: VariantInput | null | undefined): boolean {
  if (!variant) return false;
  const stock = variant.stock;
  if (!stock) return true;
  if (stock.trackQuantity && typeof stock.quantity === "number") {
    return stock.quantity > 0;
  }
  return stock.inStock !== false;
}

export function findMatchingVariant(
  variants: ReadonlyArray<VariantInput>,
  selection: ChoiceSelection,
): VariantInput | null {
  if (variants.length === 0) return null;
  const keys = Object.keys(selection);
  if (keys.length === 0) return null;
  for (const variant of variants) {
    const choices = variant.choices;
    if (!choices) continue;
    let match = true;
    for (const key of keys) {
      if (choices[key] !== selection[key]) {
        match = false;
        break;
      }
    }
    if (match) return variant;
  }
  return null;
}

export function isSelectionComplete(
  options: ReadonlyArray<ProductOptionInput>,
  selection: ChoiceSelection,
): boolean {
  for (const option of options) {
    const name = option.name;
    if (!name) continue;
    if (!selection[name]) return false;
  }
  return options.length > 0;
}

export function isChoiceAvailable(
  variants: ReadonlyArray<VariantInput>,
  optionName: string,
  choiceValue: string,
  currentSelection: ChoiceSelection,
): boolean {
  const trial: ChoiceSelection = { ...currentSelection, [optionName]: choiceValue };
  for (const variant of variants) {
    const choices = variant.choices;
    if (!choices) continue;
    let match = true;
    for (const [k, v] of Object.entries(trial)) {
      if (choices[k] !== v) {
        match = false;
        break;
      }
    }
    if (match && isVariantInStock(variant)) return true;
  }
  return false;
}

export function getSelectedPrice(
  variants: ReadonlyArray<VariantInput>,
  selection: ChoiceSelection,
  fallback: string,
): string {
  const variant = findMatchingVariant(variants, selection);
  const price = variant?.variant?.priceData?.formatted?.price;
  return price ?? fallback;
}

export function getSelectedImageUrl(
  variants: ReadonlyArray<VariantInput>,
  selection: ChoiceSelection,
  fallbackUrl: string | undefined,
): string | undefined {
  const variant = findMatchingVariant(variants, selection);
  const url = variant?.media?.mainMedia?.image?.url;
  return url ?? fallbackUrl;
}

export function initialSelection(
  options: ReadonlyArray<ProductOptionInput>,
  variants: ReadonlyArray<VariantInput>,
): ChoiceSelection {
  // Pick first in-stock variant's choices as default; if none in stock, first variant.
  const firstInStock = variants.find(isVariantInStock);
  const picked = firstInStock ?? variants[0];
  if (!picked?.choices) return {};
  const result: ChoiceSelection = {};
  for (const option of options) {
    const name = option.name;
    if (!name) continue;
    const value = picked.choices[name];
    if (value) result[name] = value;
  }
  return result;
}
