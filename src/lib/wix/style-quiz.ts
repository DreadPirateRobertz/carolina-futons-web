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

// Static options — identical to the Velo backend getQuizOptions webMethod.
// Served from this constant instead of a Velo RPC call because:
// (1) The data never changes at runtime (no DB queries in the backend).
// (2) webMethod endpoints are not exposed as HTTP functions and therefore
//     unreachable from the cfw Next.js app via /_functions/.
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
    console.error("[styleQuiz] getQuizRecommendations failed:", err);
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
      console.error(
        `[styleQuiz] captureQuizLead rpc failed: HTTP ${err.status}`,
      );
    } else {
      console.error("[styleQuiz] captureQuizLead failed:", err);
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
    console.error("[styleQuiz] getPersonalizedCopy failed:", err);
    return { copy: "", profileType: "style" };
  }
}
