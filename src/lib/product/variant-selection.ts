// Pure variant-picker logic for Wix Stores v1 products.
// Framework-free so it can be unit-tested without render setup, and reused
// by cf-3qt.2.2 AddToCart + cf-3qt.2.3 Cart Drawer.

// Per-Wix v1 schema, image-bearing media for swatch-style options lives on
// productOptions[*].choices[*].media — NOT on the Variant. The PDP variant
// picker honors that hierarchy first; Variant.media is kept on VariantInput
// only as a back-compat path for fixtures and pre-existing tests.
type ChoiceMedia = {
  mainMedia?: { image?: { url?: string | null } | null } | null;
} | null;

export type ProductOptionInput = {
  name?: string | null;
  choices?:
    | ReadonlyArray<{
        value?: string | null;
        description?: string | null;
        media?: ChoiceMedia;
      }>
    | null;
};

export type VariantInput = {
  _id?: string | null;
  choices?: Record<string, string> | null;
  variant?: {
    priceData?: {
      // `formatted.price` is the localized display string (e.g. "$619.00").
      // Wix returns the raw `price` number reliably; `formatted` is sometimes
      // omitted on per-variant data, so the picker formats from `price` itself
      // as a fallback before giving up to the product-level fallback.
      price?: number | null;
      currency?: string | null;
      formatted?: { price?: string | null } | null;
    } | null;
  } | null;
  stock?: {
    trackQuantity?: boolean | null;
    inStock?: boolean | null;
    quantity?: number | null;
  } | null;
  media?: ChoiceMedia;
};

// cfw-88r: gallery-item shape for the alt-text fallback. Matches the subset of
// Wix MediaItem we read — title and image.altText — so a poorly-configured
// catalog (no per-choice media) can still drive the variant→image swap when
// gallery photos were uploaded with the color name in their title or alt text.
export type GalleryMediaItem = {
  image?: { url?: string | null; altText?: string | null } | null;
  title?: string | null;
  mediaType?: string | null;
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
  const priceData = findMatchingVariant(variants, selection)?.variant?.priceData;
  const formatted = priceData?.formatted?.price;
  if (formatted) return formatted;
  if (typeof priceData?.price === "number" && priceData.price > 0) {
    return formatVariantCurrency(priceData.price, priceData.currency ?? "USD");
  }
  return fallback;
}

// Returns the variant-specific unit price in cents so the cart line carries
// the price the customer saw on the PDP. Falls back to the product-level cents
// when the variant has no usable priceData (manageVariants=false products, or
// transient catalog states).
export function getSelectedPriceCents(
  variants: ReadonlyArray<VariantInput>,
  selection: ChoiceSelection,
  fallbackCents: number,
): number {
  const price = findMatchingVariant(variants, selection)?.variant?.priceData?.price;
  if (typeof price === "number" && price > 0) return Math.round(price * 100);
  return fallbackCents;
}

export function getSelectedImageUrl(
  variants: ReadonlyArray<VariantInput>,
  selection: ChoiceSelection,
  fallbackUrl: string | undefined,
  productOptions?: ReadonlyArray<ProductOptionInput>,
  mediaItems?: ReadonlyArray<GalleryMediaItem>,
): string | undefined {
  // Wix Stores v1: per-choice swatch media (e.g. each color's product photo)
  // is attached to productOptions[*].choices[*].media. The Variant itself has
  // no media field, so reading it never swaps the gallery. Walk the options
  // and return the first choice-media URL matching the current selection.
  if (productOptions) {
    for (const option of productOptions) {
      const optionName = option.name;
      if (!optionName) continue;
      const value = selection[optionName];
      if (!value) continue;
      const choice = option.choices?.find((c) => c.value === value);
      const url = choice?.media?.mainMedia?.image?.url;
      if (url) return url;
    }
  }
  // cfw-88r: when admin hasn't attached per-choice media (a common state in
  // real Wix catalogs), fall back to matching the selected choice's value or
  // description against product.media.items[*].title or image.altText. Lets
  // the gallery swap fire as long as the photos were named after the color.
  if (mediaItems && mediaItems.length > 0 && productOptions) {
    for (const option of productOptions) {
      const optionName = option.name;
      if (!optionName) continue;
      const value = selection[optionName];
      if (!value) continue;
      const choice = option.choices?.find((c) => c.value === value);
      const candidates = [value, choice?.description]
        .filter((s): s is string => typeof s === "string" && s.length > 0)
        .map((s) => s.toLowerCase());
      if (candidates.length === 0) continue;
      for (const item of mediaItems) {
        if (item?.mediaType && item.mediaType !== "image") continue;
        const title = (item?.title ?? "").toLowerCase();
        const altText = (item?.image?.altText ?? "").toLowerCase();
        const matched = candidates.some(
          (c) =>
            (title.length > 0 && title.includes(c)) ||
            (altText.length > 0 && altText.includes(c)),
        );
        if (matched) {
          const url = item?.image?.url;
          if (url) return url;
        }
      }
    }
  }
  // Back-compat: variant-level media for fixtures/tests that pre-date the
  // choice-media path.
  const url = findMatchingVariant(variants, selection)?.media?.mainMedia?.image?.url;
  return url ?? fallbackUrl;
}

function formatVariantCurrency(amount: number, currency: string): string {
  const isWhole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return isWhole ? `$${amount}` : `$${amount.toFixed(2)}`;
  }
}

// cf-rrhj: shared URL-param hydration so both VariantPicker and PdpInteractive
// seed from the same initial selection. Without this, PdpInteractive starts at
// the catalog default while VariantPicker hydrates from ?finish=walnut — the
// hero image shows the wrong variant until the first swatch click.
export function hydrateFromSearch(
  defaults: ChoiceSelection,
  options: ReadonlyArray<ProductOptionInput>,
  search: URLSearchParams,
): ChoiceSelection {
  const result = { ...defaults };
  const lowerToValue = new Map<string, string>();
  search.forEach((value, key) => lowerToValue.set(key.toLowerCase(), value));
  for (const option of options) {
    const name = option.name;
    if (!name) continue;
    const fromUrl = lowerToValue.get(name.toLowerCase());
    if (!fromUrl) continue;
    const isValid = option.choices?.some((c) => c.value === fromUrl);
    if (isValid) result[name] = fromUrl;
  }
  return result;
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
