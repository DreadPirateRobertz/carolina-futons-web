export type SommelierQuestion = {
  key: string;
  title: string;
  subtitle: string;
  options: ReadonlyArray<{
    value: string;
    label: string;
    description?: string;
  }>;
};

export const SOMMELIER_QUESTIONS: ReadonlyArray<SommelierQuestion> = [
  {
    key: "sleepFrequency",
    title: "How often will the futon be slept on?",
    subtitle: "This shapes how firm and supportive the mattress should be",
    options: [
      { value: "occasional", label: "Occasionally", description: "Guests once a month or less" },
      { value: "frequent",   label: "Frequently",   description: "Guests every week or weekend stays" },
      { value: "nightly",    label: "Every night",  description: "Primary bed for an adult or child" },
    ],
  },
  {
    key: "firmness",
    title: "What mattress firmness do you prefer?",
    subtitle: "Side sleepers usually prefer softer; back sleepers prefer firmer",
    options: [
      { value: "soft",   label: "Soft",   description: "Plush, pressure-relieving feel" },
      { value: "medium", label: "Medium", description: "Balanced support and cushion" },
      { value: "firm",   label: "Firm",   description: "Solid support, minimal sink" },
    ],
  },
  {
    key: "frameStyle",
    title: "What frame style fits your space?",
    subtitle: "We build in solid oak, maple, and cherry",
    options: [
      { value: "natural",      label: "Natural wood",       description: "Light or honey-colored hardwood" },
      { value: "dark",         label: "Dark stain",         description: "Walnut or espresso finish" },
      { value: "contemporary", label: "Contemporary / metal", description: "Clean lines, mixed materials" },
    ],
  },
  {
    key: "size",
    title: "What size do you need?",
    subtitle: "Full seats 2 comfortably; queen gives a full bed width when open",
    options: [
      { value: "full",  label: "Full",  description: "54 × 75 in — our most popular" },
      { value: "queen", label: "Queen", description: "60 × 80 in — closest to a real queen bed" },
      { value: "twin",  label: "Twin",  description: "38 × 75 in — tight spaces or kids' rooms" },
    ],
  },
];

export type SommelierAnswers = {
  sleepFrequency?: string;
  firmness?: string;
  frameStyle?: string;
  size?: string;
};

export type SommelierRecommendation = {
  categorySlug: string;
  categoryLabel: string;
  reason: string;
  filterHint?: string;
};

export function getRecommendation(
  answers: SommelierAnswers,
): SommelierRecommendation {
  const { sleepFrequency, firmness, frameStyle, size } = answers;

  // Nightly sleepers need a quality mattress above all else
  if (sleepFrequency === "nightly") {
    if (firmness === "firm") {
      return {
        categorySlug: "mattresses",
        categoryLabel: "Innerspring Mattresses",
        reason:
          "For nightly sleeping on a firm surface, a high-coil-count innerspring gives the orthopedic support your back will thank you for.",
        filterHint: "innerspring",
      };
    }
    return {
      categorySlug: "mattresses",
      categoryLabel: "Cotton / Natural Fiber Mattresses",
      reason:
        "Nightly use calls for a breathable natural-fiber mattress — cotton or wool batting wicks moisture and stays comfortable all night.",
      filterHint: "cotton",
    };
  }

  // Contemporary / metal style → platform beds are a better fit
  if (frameStyle === "contemporary") {
    return {
      categorySlug: "platform-beds",
      categoryLabel: "Platform Beds",
      reason:
        "Your contemporary style preference is a natural fit for our platform bed frames — clean lines, solid hardwood, no box spring needed.",
    };
  }

  // Size + style for the frame pick
  const sizeLabel = size === "queen" ? "queen-size" : size === "twin" ? "twin" : "full-size";
  const styleLabel =
    frameStyle === "dark" ? "dark-stained hardwood" : "natural hardwood";

  return {
    categorySlug: "futon-frames",
    categoryLabel: "Futon Frames",
    reason: `A ${sizeLabel} ${styleLabel} futon frame will give you the right balance of seating and sleeping space for your usage pattern.`,
  };
}
