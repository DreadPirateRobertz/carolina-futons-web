/**
 * cf-dmos (cf-zn5b.2 / cf-mbrflow-1 G-9): address book server actions.
 *
 * Wix Headless members.updateMember overwrites the entire
 * contact.addresses array, so add/edit/delete must each read the
 * current member, mutate the array, then write the whole thing back.
 * These tests pin the read-modify-write shape so a future drift to
 * single-address-PATCH semantics (Wix doesn't currently offer one)
 * trips the suite.
 *
 * The tests mock the Wix client + member session; the action layer
 * itself is what we verify.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const getCurrentMember = vi.fn();
const updateMember = vi.fn();
const deleteMemberAddresses = vi.fn();
const logWixFailure = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/auth/member", () => ({
  getMemberSession: vi.fn(async () => ({
    tokens: {},
    accessToken: "tok",
    memberId: "mem-1",
  })),
}));

vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: () => ({
    members: {
      getCurrentMember: (...args: unknown[]) => getCurrentMember(...args),
      updateMember: (...args: unknown[]) => updateMember(...args),
      deleteMemberAddresses: (...args: unknown[]) => deleteMemberAddresses(...args),
    },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: (...args: unknown[]) => logWixFailure(...args),
}));

const memberWith = (addresses: unknown[]) => ({
  member: {
    _id: "mem-1",
    contact: { addresses },
  },
});

const SAMPLE_ADDRESS = {
  addressLine: "100 Main St",
  city: "Asheville",
  subdivision: "NC",
  postalCode: "28801",
  country: "USA",
};

describe("address-book server actions (cf-dmos)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    logWixFailure.mockResolvedValue(undefined);
  });

  describe("getMyAddresses", () => {
    it("returns the current member's addresses array", async () => {
      getCurrentMember.mockResolvedValueOnce(
        memberWith([{ _id: "a1", ...SAMPLE_ADDRESS }]),
      );
      const { getMyAddresses } = await import("@/app/actions/addresses");
      const result = await getMyAddresses();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.addresses).toHaveLength(1);
        expect(result.addresses[0]._id).toBe("a1");
      }
    });

    it("returns an empty array when the member has none", async () => {
      getCurrentMember.mockResolvedValueOnce(memberWith([]));
      const { getMyAddresses } = await import("@/app/actions/addresses");
      const result = await getMyAddresses();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.addresses).toHaveLength(0);
    });

    it("Sentry-tags the catch via logWixFailure", async () => {
      const err = new Error("Wix members down");
      getCurrentMember.mockRejectedValueOnce(err);
      const { getMyAddresses } = await import("@/app/actions/addresses");
      const result = await getMyAddresses();
      expect(result.ok).toBe(false);
      expect(logWixFailure).toHaveBeenCalledWith(
        "addresses",
        "getMyAddresses",
        err,
      );
    });
  });

  describe("addAddress", () => {
    it("read-modify-writes the whole addresses array", async () => {
      const existing = { _id: "a1", ...SAMPLE_ADDRESS };
      getCurrentMember.mockResolvedValueOnce(memberWith([existing]));
      updateMember.mockResolvedValueOnce({ member: { _id: "mem-1" } });

      const { addAddress } = await import("@/app/actions/addresses");
      const result = await addAddress({
        addressLine: "200 Oak Ave",
        city: "Hendersonville",
        subdivision: "NC",
        postalCode: "28739",
        country: "USA",
      });

      expect(result.ok).toBe(true);
      // The call must include BOTH the existing + new addresses (Wix
      // overwrites the whole array — losing an existing address would be
      // a customer-visible regression).
      expect(updateMember).toHaveBeenCalled();
      const updatedMember = updateMember.mock.calls[0][1];
      expect(updatedMember.contact.addresses).toHaveLength(2);
      expect(updatedMember.contact.addresses[0]._id).toBe("a1");
      expect(updatedMember.contact.addresses[1].addressLine).toBe("200 Oak Ave");
    });

    it("rejects when required fields are missing", async () => {
      const { addAddress } = await import("@/app/actions/addresses");
      const result = await addAddress({
        addressLine: "",
        city: "",
        subdivision: "",
        postalCode: "",
        country: "",
      });
      expect(result.ok).toBe(false);
      expect(updateMember).not.toHaveBeenCalled();
    });

    it("Sentry-tags failures", async () => {
      getCurrentMember.mockResolvedValueOnce(memberWith([]));
      const err = new Error("network");
      updateMember.mockRejectedValueOnce(err);
      const { addAddress } = await import("@/app/actions/addresses");
      const result = await addAddress(SAMPLE_ADDRESS);
      expect(result.ok).toBe(false);
      expect(logWixFailure).toHaveBeenCalledWith("addresses", "addAddress", err);
    });
  });

  describe("updateAddress", () => {
    it("replaces the matching address by _id and preserves siblings", async () => {
      const a1 = { _id: "a1", ...SAMPLE_ADDRESS };
      const a2 = {
        _id: "a2",
        addressLine: "200 Oak Ave",
        city: "Hendersonville",
        subdivision: "NC",
        postalCode: "28739",
        country: "USA",
      };
      getCurrentMember.mockResolvedValueOnce(memberWith([a1, a2]));
      updateMember.mockResolvedValueOnce({ member: { _id: "mem-1" } });

      const { updateAddress } = await import("@/app/actions/addresses");
      const result = await updateAddress("a2", {
        addressLine: "200 Oak Ave Apt 4",
        city: "Hendersonville",
        subdivision: "NC",
        postalCode: "28739",
        country: "USA",
      });

      expect(result.ok).toBe(true);
      const updatedMember = updateMember.mock.calls[0][1];
      expect(updatedMember.contact.addresses).toHaveLength(2);
      const updated = updatedMember.contact.addresses.find(
        (a: { _id: string }) => a._id === "a2",
      );
      expect(updated?.addressLine).toBe("200 Oak Ave Apt 4");
      const preserved = updatedMember.contact.addresses.find(
        (a: { _id: string }) => a._id === "a1",
      );
      expect(preserved?.addressLine).toBe("100 Main St");
    });

    it("rejects when the address id is unknown", async () => {
      getCurrentMember.mockResolvedValueOnce(
        memberWith([{ _id: "a1", ...SAMPLE_ADDRESS }]),
      );
      const { updateAddress } = await import("@/app/actions/addresses");
      const result = await updateAddress("a-missing", SAMPLE_ADDRESS);
      expect(result.ok).toBe(false);
      expect(updateMember).not.toHaveBeenCalled();
    });

    it("Sentry-tags failures", async () => {
      getCurrentMember.mockResolvedValueOnce(
        memberWith([{ _id: "a1", ...SAMPLE_ADDRESS }]),
      );
      const err = new Error("network");
      updateMember.mockRejectedValueOnce(err);
      const { updateAddress } = await import("@/app/actions/addresses");
      const result = await updateAddress("a1", SAMPLE_ADDRESS);
      expect(result.ok).toBe(false);
      expect(logWixFailure).toHaveBeenCalledWith(
        "addresses",
        "updateAddress",
        err,
      );
    });
  });

  describe("deleteAddress", () => {
    it("removes the address by _id and writes the remainder", async () => {
      const a1 = { _id: "a1", ...SAMPLE_ADDRESS };
      const a2 = {
        _id: "a2",
        addressLine: "200 Oak Ave",
        city: "Hendersonville",
        subdivision: "NC",
        postalCode: "28739",
        country: "USA",
      };
      getCurrentMember.mockResolvedValueOnce(memberWith([a1, a2]));
      updateMember.mockResolvedValueOnce({ member: { _id: "mem-1" } });

      const { deleteAddress } = await import("@/app/actions/addresses");
      const result = await deleteAddress("a1");

      expect(result.ok).toBe(true);
      const updatedMember = updateMember.mock.calls[0][1];
      expect(updatedMember.contact.addresses).toHaveLength(1);
      expect(updatedMember.contact.addresses[0]._id).toBe("a2");
    });

    it("uses deleteMemberAddresses when the result would be the last address (Wix empty-array quirk)", async () => {
      // Wix docs: "passing an empty array will have no effect; these methods
      // must be used to clear all data: deleteMemberAddresses()". The action
      // must detect this case and route through the dedicated endpoint.
      getCurrentMember.mockResolvedValueOnce(
        memberWith([{ _id: "a1", ...SAMPLE_ADDRESS }]),
      );
      deleteMemberAddresses.mockResolvedValueOnce(undefined);

      const { deleteAddress } = await import("@/app/actions/addresses");
      const result = await deleteAddress("a1");

      expect(result.ok).toBe(true);
      expect(deleteMemberAddresses).toHaveBeenCalled();
      // The fallback path must NOT hit updateMember (the empty-array no-op).
      expect(updateMember).not.toHaveBeenCalled();
    });

    it("Sentry-tags failures", async () => {
      getCurrentMember.mockResolvedValueOnce(
        memberWith([
          { _id: "a1", ...SAMPLE_ADDRESS },
          { _id: "a2", ...SAMPLE_ADDRESS },
        ]),
      );
      const err = new Error("network");
      updateMember.mockRejectedValueOnce(err);
      const { deleteAddress } = await import("@/app/actions/addresses");
      const result = await deleteAddress("a1");
      expect(result.ok).toBe(false);
      expect(logWixFailure).toHaveBeenCalledWith(
        "addresses",
        "deleteAddress",
        err,
      );
    });
  });
});
