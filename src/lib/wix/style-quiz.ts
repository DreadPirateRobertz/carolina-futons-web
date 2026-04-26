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

export async function getQuizOptions(): Promise<QuizOptions | null> {
  try {
    return await callVelo<QuizOptions>({
      method: "styleQuiz/getQuizOptions",
      args: [],
    });
  } catch (err) {
    console.error("[styleQuiz] getQuizOptions failed:", err);
    return null;
  }
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
