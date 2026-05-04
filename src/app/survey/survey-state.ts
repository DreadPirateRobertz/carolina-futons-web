export type SurveyActionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export const initialSurveyActionState: SurveyActionState = { status: "idle" };
