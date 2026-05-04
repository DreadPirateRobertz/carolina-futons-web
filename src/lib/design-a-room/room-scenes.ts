export type RoomStyle = "modern" | "rustic" | "minimalist";
export type SceneProduct = "futon" | "murphy" | "platform";

export interface RoomStyleConfig {
  label: string;
  wallColor: string;
  leftWallColor: string;
  floorColor: string;
  floorStripeColor: string;
  productColor: string;
  productShade: string;
  rugColor: string;
  rugBorder: string;
  accentColor: string;
  plantColor: string;
}

export const ROOM_STYLES: Record<RoomStyle, RoomStyleConfig> = {
  modern: {
    label: "Modern",
    wallColor: "#f2f2ef",
    leftWallColor: "#e6e6e2",
    floorColor: "#8b6f5e",
    floorStripeColor: "#7a6050",
    productColor: "#4a7d94",
    productShade: "#3a6a7e",
    rugColor: "#2c2c3a",
    rugBorder: "#3a3a4e",
    accentColor: "#d4c8b0",
    plantColor: "#4a7052",
  },
  rustic: {
    label: "Rustic",
    wallColor: "#f7f0e4",
    leftWallColor: "#f0e6d4",
    floorColor: "#c4894a",
    floorStripeColor: "#b07a40",
    productColor: "#6b8f71",
    productShade: "#5a7860",
    rugColor: "#8b4a32",
    rugBorder: "#7a3c28",
    accentColor: "#d4a878",
    plantColor: "#3d6e40",
  },
  minimalist: {
    label: "Minimalist",
    wallColor: "#fafaf7",
    leftWallColor: "#f4f4f0",
    floorColor: "#d4c9b5",
    floorStripeColor: "#c8bda8",
    productColor: "#e0d8cc",
    productShade: "#cfc6b8",
    rugColor: "#e8e0d4",
    rugBorder: "#ddd4c6",
    accentColor: "#d0cdc8",
    plantColor: "#8fa880",
  },
};

export const ROOM_STYLE_ORDER: RoomStyle[] = ["modern", "rustic", "minimalist"];

export const SCENE_PRODUCTS: { id: SceneProduct; label: string }[] = [
  { id: "futon", label: "Futon Frame" },
  { id: "murphy", label: "Murphy Bed" },
  { id: "platform", label: "Platform Bed" },
];
