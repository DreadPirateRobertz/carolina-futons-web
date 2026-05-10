// cfw-0ne: coverage for src/lib/wix/members.ts. Thin typed accessors
// over @wix/members. The contract: getCurrentMember and getMemberById
// each return the member OR null — never throw a NoMember error past
// the wrapper. A regression that lets a missing-member case bubble
// breaks the "member optional" branches in every consumer (Footer
// account hint, owner gate, etc.).

import { describe, it, expect, beforeEach, vi } from "vitest";

const getCurrentMember = vi.fn();
const getMember = vi.fn();

vi.mock("@/lib/wix-client", () => ({
  getWixClient: () => ({
    members: {
      getCurrentMember: (...args: unknown[]) => getCurrentMember(...args),
      getMember: (...args: unknown[]) => getMember(...args),
    },
  }),
}));

import {
  getCurrentMember as getCurrentMemberAccessor,
  getMemberById,
} from "@/lib/wix/members";

beforeEach(() => {
  getCurrentMember.mockReset();
  getMember.mockReset();
});

describe("getCurrentMember (lib accessor)", () => {
  it("returns the member from result.member when present", async () => {
    const member = { _id: "m-1", profile: { nickname: "Brenda" } };
    getCurrentMember.mockResolvedValue({ member });

    expect(await getCurrentMemberAccessor()).toEqual(member);
  });

  it("returns null when result.member is undefined (signed-out shape)", async () => {
    getCurrentMember.mockResolvedValue({});

    expect(await getCurrentMemberAccessor()).toBeNull();
  });

  it("returns null when result.member is explicitly null", async () => {
    getCurrentMember.mockResolvedValue({ member: null });

    expect(await getCurrentMemberAccessor()).toBeNull();
  });

  it("propagates rejections from the SDK (caller decides handling)", async () => {
    getCurrentMember.mockRejectedValue(new Error("network"));

    await expect(getCurrentMemberAccessor()).rejects.toThrow("network");
  });
});

describe("getMemberById", () => {
  it("forwards the id to client.members.getMember", async () => {
    getMember.mockResolvedValue({ _id: "m-2" });

    await getMemberById("m-2");

    expect(getMember).toHaveBeenCalledWith("m-2");
  });

  it("returns the member when present", async () => {
    const member = { _id: "m-3", loginEmail: "x@y.z" };
    getMember.mockResolvedValue(member);

    expect(await getMemberById("m-3")).toEqual(member);
  });

  it("returns null when SDK resolves with falsy (undefined / null)", async () => {
    getMember.mockResolvedValueOnce(undefined);
    expect(await getMemberById("missing-1")).toBeNull();

    getMember.mockResolvedValueOnce(null);
    expect(await getMemberById("missing-2")).toBeNull();
  });

  it("propagates rejections from the SDK", async () => {
    getMember.mockRejectedValue(new Error("not found"));

    await expect(getMemberById("bad-id")).rejects.toThrow("not found");
  });
});
