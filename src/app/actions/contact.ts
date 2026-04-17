"use server";

// Server action skeleton for the PDP/contact form. blaidd wires the real
// Velo `/_functions/contact` call in cf-3qt.4. Keeping the discriminated-union
// shape so client components can import the types today.

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; message?: string };

export interface ContactInput {
  name: string;
  email: string;
  phone?: string;
  message: string;
  source?: string;
}

export async function submitContact(
  _input: ContactInput,
): Promise<ActionResult> {
  return {
    ok: false,
    error: "not-implemented",
    message:
      "submitContact scaffolded; blaidd wires Velo /_functions/contact in cf-3qt.4.",
  };
}
