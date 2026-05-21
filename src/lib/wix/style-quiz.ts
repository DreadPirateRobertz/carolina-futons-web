import { logError } from "@/lib/observability/log";
import { callVelo, VeloRpcError } from "@/lib/wix/velo-client";

export type QuizOption = {
  value: string;
  label: string;
  description?: string;
  icon?: string;
};

export type QuizOptions = {
  roomTypes: QuizOption[];
  primaryUses: QuizOption[];
  stylePreferences: QuizOption[];
  sizeOptions: QuizOption[];
  budgetRanges: QuizOption[];
};

export type QuizAnswers = {
  roomType?: string;
  primaryUse?: string;
  stylePreference?: string;
  sizeNeeds?: string;
  budgetRange?: string;
};

export type QuizProduct = {
  _id: string;
  name: string;
  slug: string;
  price: number;
  formattedPrice: string;
  mainMedia?: unknown;
};

export type QuizRecommendation = {
  product: QuizProduct;
  score: number;
  reason: string;
};

// Canonical quiz option data — served from this constant instead of Velo.
// Velo webMethods are only callable from within the Wix site runtime; the
// Next.js host cannot reach them (different runtime, no shared RPC bridge).
// The data is fully static (no DB queries in the Velo source), so this
// constant IS the source of truth. If options ever need to be dynamic,
// expose them via a Velo HTTP function in http-functions.js instead.
const STATIC_QUIZ_OPTIONS: QuizOptions = {
  roomTypes: [
    { value: "living-room", label: "Living Room", icon: "sofa" },
    { value: "guest-room",  label: "Guest Room",  icon: "bed" },
    { value: "dorm",        label: "Dorm / Small Space", icon: "apartment" },
    { value: "office",      label: "Home Office", icon: "desk" },
    { value: "bedroom",     label: "Bedroom",     icon: "moon" },
  ],
  primaryUses: [
    { value: "sitting",  label: "Primarily Sitting",  description: "Couch by day" },
    { value: "sleeping", label: "Primarily Sleeping", description: "Bed by night" },
    { value: "both",     label: "Both Equally",       description: "Versatile day and night" },
  ],
  stylePreferences: [
    { value: "modern",  label: "Modern / Contemporary", description: "Clean lines, minimal design" },
    { value: "rustic",  label: "Rustic / Natural",      description: "Warm wood, handcrafted feel" },
    { value: "classic", label: "Classic / Traditional", description: "Timeless elegance" },
  ],
  sizeOptions: [
    { value: "twin",  label: "Twin",  description: "Great for one person" },
    { value: "full",  label: "Full",  description: "Our most popular size" },
    { value: "queen", label: "Queen", description: "Maximum comfort" },
  ],
  budgetRanges: [
    { value: "under-500",  label: "Under $500",      description: "Budget-friendly options" },
    { value: "500-1000",   label: "$500 - $1,000",   description: "Our sweet spot" },
    { value: "1000-2000",  label: "$1,000 - $2,000", description: "Premium selections" },
    { value: "over-2000",  label: "Over $2,000",     description: "Top of the line" },
  ],
};

export async function getQuizOptions(): Promise<QuizOptions | null> {
  return STATIC_QUIZ_OPTIONS;
}

export async function getQuizRecommendations(
  answers: QuizAnswers,
): Promise<QuizRecommendation[]> {
  try {
    return await callVelo<QuizRecommendation[]>({
      method: "styleQuiz/getQuizRecommendations",
      args: [answers],
    });
  } catch (err) {
    logError("styleQuiz", "getQuizRecommendations failed", err);
    return [];
  }
}

export async function captureQuizLead(
  email: string,
  partialAnswers: QuizAnswers,
): Promise<{ success: boolean; message?: string }> {
  try {
    return await callVelo<{ success: boolean; message?: string }>({
      method: "styleQuiz/captureQuizLead",
      args: [email, partialAnswers],
    });
  } catch (err) {
    if (err instanceof VeloRpcError) {
      logError("styleQuiz", `captureQuizLead rpc failed: HTTP ${err.status}`);
    } else {
      logError("styleQuiz", "captureQuizLead failed", err);
    }
    return { success: false };
  }
}

export async function getPersonalizedCopy(
  answers: QuizAnswers,
): Promise<{ copy: string; profileType: string }> {
  try {
    return await callVelo<{ copy: string; profileType: string }>({
      method: "styleQuiz/getPersonalizedCopy",
      args: [answers],
    });
  } catch (err) {
    logError("styleQuiz", "getPersonalizedCopy failed", err);
    return { copy: "", profileType: "style" };
  }
}
