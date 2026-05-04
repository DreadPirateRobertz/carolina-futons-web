// Wishlist item shape — matches the Velo wishlistService contract so the
// Next.js client and the Velo backend speak the same wire format.

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
