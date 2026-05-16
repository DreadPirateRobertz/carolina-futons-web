/**
 * cf-dmos (cf-zn5b.2 / cf-mbrflow-1 G-9): server actions for the member
 * address-book page. Wix Headless members.updateMember overwrites the
 * entire contact.addresses array on each write (per the SDK docs), so
 * add/edit/delete is read-modify-write. The dedicated
 * deleteMemberAddresses endpoint handles the "clear all" case because
 * passing an empty array to updateMember is a documented no-op.
 *
 * All four actions tag Sentry via logWixFailure on the catch path —
 * matches the cf-8ys6 cart-action observability convention.
 */
"use server";

import { revalidatePath } from "next/cache";

import { getMemberSession } from "@/lib/auth/member";
import { getWixClientWithTokens } from "@/lib/wix-client";
import { logWixFailure } from "@/lib/wix/errors";

export type Address = {
  _id?: string;
  addressLine: string;
  addressLine2?: string;
  city: string;
  subdivision: string;
  postalCode: string;
  country: string;
};

export type AddressInput = Omit<Address, "_id">;

export type AddressActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type GetAddressesResult =
  | { ok: true; addresses: Address[] }
  | { ok: false; error: string };

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unknown address-book error";
}

function isMissing(input: AddressInput): string | null {
  if (!input.addressLine?.trim()) return "Street address is required";
  if (!input.city?.trim()) return "City is required";
  if (!input.subdivision?.trim()) return "State is required";
  if (!input.postalCode?.trim()) return "Postal code is required";
  if (!input.country?.trim()) return "Country is required";
  return null;
}

async function readAddresses(): Promise<Address[]> {
  const session = await getMemberSession();
  if (!session) throw new Error("Not authenticated");
  const client = getWixClientWithTokens(session.tokens);
  const { member } = await client.members.getCurrentMember();
  const raw = (member?.contact?.addresses ?? []) as Address[];
  return raw;
}

export async function getMyAddresses(): Promise<GetAddressesResult> {
  try {
    const addresses = await readAddresses();
    return { ok: true, addresses };
  } catch (err) {
    void logWixFailure("addresses", "getMyAddresses", err);
    return { ok: false, error: toMessage(err) };
  }
}

export async function addAddress(
  input: AddressInput,
): Promise<AddressActionResult> {
  const validationError = isMissing(input);
  if (validationError) return { ok: false, error: validationError };
  try {
    const session = await getMemberSession();
    if (!session) return { ok: false, error: "Not authenticated" };
    const client = getWixClientWithTokens(session.tokens);
    const { member } = await client.members.getCurrentMember();
    const existing = (member?.contact?.addresses ?? []) as Address[];
    const next: Address[] = [...existing, { ...input }];
    await client.members.updateMember(session.memberId, {
      contact: { addresses: next },
    });
    revalidatePath("/dashboard/addresses");
    return { ok: true };
  } catch (err) {
    void logWixFailure("addresses", "addAddress", err);
    return { ok: false, error: toMessage(err) };
  }
}

export async function updateAddress(
  id: string,
  input: AddressInput,
): Promise<AddressActionResult> {
  if (!id) return { ok: false, error: "Missing address id" };
  const validationError = isMissing(input);
  if (validationError) return { ok: false, error: validationError };
  try {
    const session = await getMemberSession();
    if (!session) return { ok: false, error: "Not authenticated" };
    const client = getWixClientWithTokens(session.tokens);
    const { member } = await client.members.getCurrentMember();
    const existing = (member?.contact?.addresses ?? []) as Address[];
    const idx = existing.findIndex((a) => a._id === id);
    if (idx < 0) return { ok: false, error: "Address not found" };
    const next: Address[] = existing.map((a, i) =>
      i === idx ? { ...input, _id: id } : a,
    );
    await client.members.updateMember(session.memberId, {
      contact: { addresses: next },
    });
    revalidatePath("/dashboard/addresses");
    return { ok: true };
  } catch (err) {
    void logWixFailure("addresses", "updateAddress", err);
    return { ok: false, error: toMessage(err) };
  }
}

export async function deleteAddress(
  id: string,
): Promise<AddressActionResult> {
  if (!id) return { ok: false, error: "Missing address id" };
  try {
    const session = await getMemberSession();
    if (!session) return { ok: false, error: "Not authenticated" };
    const client = getWixClientWithTokens(session.tokens);
    const { member } = await client.members.getCurrentMember();
    const existing = (member?.contact?.addresses ?? []) as Address[];
    const next = existing.filter((a) => a._id !== id);

    // Wix quirk: updateMember with an empty contact.addresses array is a
    // no-op (documented). Route through deleteMemberAddresses to actually
    // clear the last entry.
    if (next.length === 0) {
      await client.members.deleteMemberAddresses(session.memberId);
    } else {
      await client.members.updateMember(session.memberId, {
        contact: { addresses: next },
      });
    }
    revalidatePath("/dashboard/addresses");
    return { ok: true };
  } catch (err) {
    void logWixFailure("addresses", "deleteAddress", err);
    return { ok: false, error: toMessage(err) };
  }
}
