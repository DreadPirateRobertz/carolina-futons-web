export type SpinPrize = {
  id: string;
  label: string;
  description: string;
  color: string;
};

export const SPIN_PRIZES: ReadonlyArray<SpinPrize> = [
  { id: "5off",     label: "5% Off",           description: "5% off your next order",          color: "#3A2518" },
  { id: "10off",    label: "10% Off",           description: "10% off your next order",         color: "#7A4F3A" },
  { id: "freeswap", label: "Free Swatch Pack",  description: "Free 5-swatch sample kit",        color: "#A0522D" },
  { id: "fship",    label: "Free Shipping",     description: "Free white-glove delivery",       color: "#C68B5A" },
  { id: "bdeal",    label: "Bundle Deal",       description: "Extra 5% on frame + mattress",   color: "#D2956E" },
  { id: "nomatch",  label: "Try Again",         description: "Better luck next time!",          color: "#E8C4A0" },
];

export type SpinActionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; prize: SpinPrize; cooldownHours: number };

export const initialSpinActionState: SpinActionState = { status: "idle" };
