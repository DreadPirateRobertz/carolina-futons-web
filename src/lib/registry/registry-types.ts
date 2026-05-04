export type RegistryOccasion =
  | "wedding"
  | "housewarming"
  | "dorm"
  | "baby"
  | "holiday"
  | "other";

export const OCCASION_LABELS: Record<RegistryOccasion, string> = {
  wedding: "Wedding",
  housewarming: "Housewarming",
  dorm: "Dorm / Back to School",
  baby: "Baby Shower",
  holiday: "Holiday",
  other: "Other",
};

export type RegistryItem = {
  _id: string;
  productId: string;
  productName: string;
  productPrice: number;
  imageUrl?: string;
  quantity: number;
  purchasedQuantity: number;
  remaining?: number;
  purchasedBy?: string | null;
  priority: 1 | 2 | 3;
  notes: string;
  productSlug?: string;
};

export type RegistrySummary = {
  _id: string;
  title: string;
  slug: string;
  occasion: RegistryOccasion;
  eventDate?: string | null;
  isPublic: boolean;
  itemCount: number;
  createdDate?: string;
};

export type RegistryDetail = {
  _id: string;
  title: string;
  slug: string;
  occasion: RegistryOccasion;
  eventDate?: string | null;
  message?: string;
  isPublic: boolean;
  items: RegistryItem[];
};

export type PublicRegistry = {
  title: string;
  occasion: RegistryOccasion;
  eventDate?: string | null;
  message?: string;
  items: RegistryItem[];
};
