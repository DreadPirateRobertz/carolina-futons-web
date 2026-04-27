import type {
  SwatchContactInfo,
  SwatchRequestErrors,
} from "@/lib/swatch-request/swatch-request-schema";

// Extracted from actions.ts — "use server" modules may only export async
// functions, so state types + initial value live here.

export type SwatchRequestActionState =
  | { status: "idle" }
  | {
      status: "error";
      errors: SwatchRequestErrors;
      transportError?: string;
      values: SwatchContactInfo;
      selectedIds: string[];
    }
  | { status: "success" };

export const initialSwatchRequestState: SwatchRequestActionState = {
  status: "idle",
};
