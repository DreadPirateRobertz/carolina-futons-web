import {
  listCollectionItems,
  queryCollectionWhere,
  getCollectionItemBySlug,
  type WixDataItem,
} from "@/lib/wix/data";

export type Landing = WixDataItem & {
  slug: string;
  title: string;
  headline: string;
  subheadline?: string;
  heroImageUrl?: string;
  ctaPrimaryLabel?: string;
  ctaPrimaryHref?: string;
  ctaSecondaryLabel?: string;
  ctaSecondaryHref?: string;
  bodyMdx?: string;
  utmDefaults?: string;
  activeFrom?: string;
  activeUntil?: string;
  seoDescription?: string;
  ogImageUrl?: string;
};

export type PressMention = WixDataItem & {
  outlet: string;
  outletLogoUrl?: string;
  articleTitle: string;
  articleUrl: string;
  publishedDate: string;
  excerpt?: string;
  category?: string;
  featured?: boolean;
  sortOrder?: number;
};

export type PressKitAsset = WixDataItem & {
  name: string;
  description?: string;
  fileUrl: string;
  fileType?: string;
  fileSizeBytes?: number;
  category?: string;
  sortOrder?: number;
};

export type ComparisonFeature = WixDataItem & {
  featureKey: string;
  label: string;
  description?: string;
  category?: string;
  sortOrder?: number;
  values?: string;
};

export function getLandingBySlug(slug: string): Promise<Landing | null> {
  return getCollectionItemBySlug<Landing>("Landings", slug);
}

export function listPressMentions(limit = 50): Promise<PressMention[]> {
  return listCollectionItems<PressMention>("PressMentions", limit);
}

export function listFeaturedPressMentions(limit = 10): Promise<PressMention[]> {
  return queryCollectionWhere<PressMention>("PressMentions", "featured", true, limit);
}

export function listPressKitAssets(limit = 50): Promise<PressKitAsset[]> {
  return listCollectionItems<PressKitAsset>("PressKitAssets", limit);
}

export function listComparisonFeatures(limit = 100): Promise<ComparisonFeature[]> {
  return listCollectionItems<ComparisonFeature>("ComparisonFeatures", limit);
}
