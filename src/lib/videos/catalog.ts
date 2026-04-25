// Static catalog of Carolina Futons product demo videos. Ported from the
// Wix Velo videoPageHelpers.js. Data source is intentionally static — the
// catalog rarely changes and a static module beats a CMS round-trip for a
// 18-row gallery. Promote to a Wix CMS read when editorial cadence justifies.

export type VideoCategory = "overview" | "futon" | "conversion" | "assembly";

export type VideoSource = "wix" | "youtube" | "mp4";

export type VideoEntry = {
  id: string;
  title: string;
  description: string;
  category: VideoCategory;
  source: VideoSource;
  videoUrl: string;
  embedUrl?: string;
  posterUrl?: string;
  productSlug?: string;
  brand?: string;
  sortOrder: number;
};

type WixSeed = {
  id: string;
  title: string;
  description: string;
  category: VideoCategory;
  videoUri: string;
  productSlug?: string;
  sortOrder: number;
};

type YouTubeSeed = {
  id: string;
  title: string;
  description: string;
  category: VideoCategory;
  brand: string;
  youtubeId: string;
  productSlug?: string;
  sortOrder: number;
};

type Mp4Seed = {
  id: string;
  title: string;
  description: string;
  category: VideoCategory;
  brand: string;
  mp4Url: string;
  productSlug?: string;
  sortOrder: number;
};

const WIX_SEEDS: readonly WixSeed[] = [
  { id: "vid-intro", title: "Intro", description: "Welcome to Carolina Futons — see what makes our furniture special.", category: "overview", videoUri: "e04e89_ea16ef6edfe64c03a5bfdd0ee468ab7f", sortOrder: 0 },
  { id: "vid-asheville", title: "Asheville", description: "The Asheville futon frame — a Night & Day Furniture classic.", category: "futon", videoUri: "e04e89_c2e8bedf07c74b249894fffffc0564b7", productSlug: "asheville-futon-frame", sortOrder: 1 },
  { id: "vid-sedona", title: "Sedona", description: "The Sedona futon frame with Southwest-inspired design.", category: "futon", videoUri: "e04e89_8483b56d2ef5417c95242c821934e2b2", productSlug: "sedona-futon-frame", sortOrder: 2 },
  { id: "vid-alpine", title: "Alpine", description: "The Alpine futon frame — rustic meets modern.", category: "futon", videoUri: "e04e89_dba4fc2f08ee4a42906dcb76bcb9b31a", productSlug: "alpine-futon-frame", sortOrder: 3 },
  { id: "vid-northampton", title: "Northampton", description: "The Northampton futon frame — clean lines and solid hardwood.", category: "futon", videoUri: "e04e89_c1969fc88dcb4c829f3840b250f19166", productSlug: "northampton-futon-frame", sortOrder: 4 },
  { id: "vid-mountainnaire", title: "Mountainnaire", description: "The Mountainnaire futon frame — mountain-inspired elegance.", category: "futon", videoUri: "e04e89_b6c0b062855d432a91698f3460b74552", productSlug: "mountainnaire-futon-frame", sortOrder: 5 },
  { id: "vid-maricopa", title: "Maricopa", description: "The Maricopa futon frame — versatile and built to last.", category: "futon", videoUri: "e04e89_b10b923982664fa39409244ac93dadcf", productSlug: "maricopa-futon-frame", sortOrder: 6 },
  { id: "vid-flagstaff", title: "Flagstaff", description: "The Flagstaff futon frame — timeless style, durable construction.", category: "futon", videoUri: "e04e89_973ed5df7eb34c1d9ad7c1697e8d0f72", productSlug: "flagstaff-futon-frame", sortOrder: 7 },
  { id: "vid-studio-conversion", title: "Studio Conversion", description: "See the Studio futon convert from sofa to bed in seconds.", category: "conversion", videoUri: "e04e89_d9ffa580eb5a4fa784bc6bb6a6105257", sortOrder: 8 },
  { id: "vid-wallhugger-conversion", title: "WallHugger Conversion", description: "The WallHugger frame converts without pulling away from the wall.", category: "conversion", videoUri: "e04e89_d49b6de8f0b4471bb132c612497fd53c", sortOrder: 9 },
  { id: "vid-moonglider-conversion", title: "MoonGlider Conversion", description: "Watch the MoonGlider glide smoothly from sofa to sleeper.", category: "conversion", videoUri: "e04e89_b8d2371453a0487abf8224d6256bdfe0", sortOrder: 10 },
];

const YOUTUBE_SEEDS: readonly YouTubeSeed[] = [
  { id: "v-kd-001", title: "Nomad Platform Bed Assembly", description: "Step-by-step assembly guide for the KD Frames Nomad Platform Bed.", category: "assembly", brand: "KD Frames", youtubeId: "EC1GCQ5CiSo", productSlug: "nomad-platform-bed", sortOrder: 100 },
  { id: "v-kd-002", title: "Charleston Platform Bed Assembly", description: "Assembly instructions for the KD Frames Charleston Platform Bed.", category: "assembly", brand: "KD Frames", youtubeId: "ouc5kWkEMfE", productSlug: "charleston-platform-bed", sortOrder: 101 },
  { id: "v-kd-003", title: "Fold Platform Bed Assembly", description: "How to assemble the KD Frames Fold Platform Bed.", category: "assembly", brand: "KD Frames", youtubeId: "Xi4Gddlhzd0", productSlug: "fold-platform-bed", sortOrder: 102 },
  { id: "v-kd-004", title: "Studio Bifold Futon Assembly", description: "Assembly walkthrough for the KD Frames Studio Bifold Futon.", category: "assembly", brand: "KD Frames", youtubeId: "lDnFOcn7qZ8", productSlug: "studio-bifold-futon", sortOrder: 103 },
  { id: "v-kd-005", title: "KD Lounger Assembly", description: "Assembly guide for the KD Frames Lounger.", category: "assembly", brand: "KD Frames", youtubeId: "RjBfOFzDxuo", productSlug: "kd-lounger", sortOrder: 104 },
];

const MP4_SEEDS: readonly Mp4Seed[] = [
  { id: "v-strata-001", title: "Dillon Wall Hugger Conversion", description: "Watch the Strata Dillon wall hugger futon convert smoothly — no wall clearance needed.", category: "conversion", brand: "Strata Furniture", mp4Url: "https://store.stratafurniture.com/wp-content/uploads/2022/01/Dillon_animation.mp4", productSlug: "dillon-futon-frame", sortOrder: 11 },
];

function buildWix(seed: WixSeed): VideoEntry {
  return {
    id: seed.id,
    title: seed.title,
    description: seed.description,
    category: seed.category,
    productSlug: seed.productSlug,
    sortOrder: seed.sortOrder,
    source: "wix",
    videoUrl: `https://video.wixstatic.com/video/${seed.videoUri}/1080p/mp4/file.mp4`,
    posterUrl: `https://static.wixstatic.com/media/${seed.videoUri}f000.jpg/v1/fill/w_640,h_360,q_80/file.jpg`,
  };
}

function buildYouTube(seed: YouTubeSeed): VideoEntry {
  return {
    id: seed.id,
    title: seed.title,
    description: seed.description,
    category: seed.category,
    brand: seed.brand,
    productSlug: seed.productSlug,
    sortOrder: seed.sortOrder,
    source: "youtube",
    videoUrl: `https://www.youtube.com/watch?v=${seed.youtubeId}`,
    embedUrl: `https://www.youtube.com/embed/${seed.youtubeId}`,
    posterUrl: `https://img.youtube.com/vi/${seed.youtubeId}/hqdefault.jpg`,
  };
}

function buildMp4(seed: Mp4Seed): VideoEntry {
  return {
    id: seed.id,
    title: seed.title,
    description: seed.description,
    category: seed.category,
    brand: seed.brand,
    productSlug: seed.productSlug,
    sortOrder: seed.sortOrder,
    source: "mp4",
    videoUrl: seed.mp4Url,
  };
}

export function getVideoCatalog(): VideoEntry[] {
  return [
    ...WIX_SEEDS.map(buildWix),
    ...YOUTUBE_SEEDS.map(buildYouTube),
    ...MP4_SEEDS.map(buildMp4),
  ].sort((a, b) => a.sortOrder - b.sortOrder);
}

export type VideoCategoryOption = {
  id: VideoCategory | "all";
  label: string;
};

export function getVideoCategoryOptions(): VideoCategoryOption[] {
  return [
    { id: "all", label: "All Videos" },
    { id: "overview", label: "Overview" },
    { id: "futon", label: "Futon Frames" },
    { id: "conversion", label: "Conversion Demos" },
    { id: "assembly", label: "Assembly Guides" },
  ];
}

export function filterVideosByCategory(
  videos: readonly VideoEntry[],
  category: VideoCategory | "all" | null,
): VideoEntry[] {
  if (!category || category === "all") return [...videos];
  return videos.filter((v) => v.category === category);
}
