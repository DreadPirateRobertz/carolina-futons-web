// cf-rs9k: shape of a wishlist item as returned by Velo
// wishlistService.getWishlist's _mapItem helper. Defined here on the cfw
// side so consumers don't import from the backend module.

export type WishlistItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  priceAtAdd: number;
  imageUrl: string;
  productSlug: string;
  inStock: boolean;
  addedAt: string | null;
};

export type WishlistResponse = {
  success: boolean;
  items: WishlistItem[];
  total: number;
};
