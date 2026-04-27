export interface DesignStep {
  title: string;
  body: string;
}

export const DESIGN_STEPS: readonly DesignStep[] = [
  {
    title: "Tell us about the space",
    body: "Bring a rough floor plan, a couple of photos, and how the room has to work day-to-day. A spare room that sleeps guests twice a year has very different priorities than a primary sitting room.",
  },
  {
    title: "Pick a frame and fabric",
    body: "We walk you through real fabric swatches and frame options — solid hardwood, metal, or a low platform — that fit the size and the traffic pattern. Our frames carry a 15-year warranty.",
  },
  {
    title: "See it before you buy",
    body: "We mock the layout in a simple plan view so you can confirm clearances, doorways, and how the mattress folds out before anything leaves the Hendersonville showroom.",
  },
];

export type FutonOption = {
  label: string;
  shortLabel: string;
  widthIn: number;
  depthIn: number;
};

// Dimensions are sleeping/open footprint (worst-case floor clearance for room planning).
export const FUTON_OPTIONS: readonly FutonOption[] = [
  { label: 'Twin futon (38" × 75")', shortLabel: "Twin futon", widthIn: 38, depthIn: 75 },
  { label: 'Full futon (54" × 75")', shortLabel: "Full futon", widthIn: 54, depthIn: 75 },
  { label: 'Queen futon (60" × 80")', shortLabel: "Queen futon", widthIn: 60, depthIn: 80 },
  { label: 'Full murphy bed (56" × 83")', shortLabel: "Full murphy", widthIn: 56, depthIn: 83 },
  { label: 'Queen murphy bed (64" × 87")', shortLabel: "Queen murphy", widthIn: 64, depthIn: 87 },
];

export const DEFAULT_FUTON_IDX = 1;
