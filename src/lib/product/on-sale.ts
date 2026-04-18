// cf-3qt.6.D: client-side discount filter for /shop/mattresses-sale.
//
// Rather than maintain a hand-curated Wix "mattresses-sale" collection,
// the PLP fetches the full mattresses collection and filters to products
// whose Wix Stores discount drops priceData.discountedPrice below
// priceData.price. Sales auto-appear/disappear as merchants toggle
// discounts in Wix admin.
//
// Variant-priced products (manageVariants: true, e.g. Mesa mattresses) have
// priceData.price === 0 at the product level and are excluded here. They're
// covered separately by cf-3qt.6.E once variant data is loaded correctly.

export type OnSaleCheckable = {
  priceData?: {
    price?: number | null;
    discountedPrice?: number | null;
  } | null;
};

export function isProductOnSale(product: OnSaleCheckable): boolean {
  const price = product.priceData?.price;
  const discounted = product.priceData?.discountedPrice;
  if (typeof price !== "number" || price <= 0) return false;
  if (typeof discounted !== "number" || discounted <= 0) return false;
  return discounted < price;
}
