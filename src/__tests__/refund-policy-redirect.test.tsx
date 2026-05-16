// cfw-di0: /refund-policy → permanentRedirect("/returns").
//
// Wix Studio production has a Refund Policy.js page; cfw didn't carry
// the route through the cf-3qt migration. Without the redirect, inbound
// link traffic (email, search results, external blog mentions) 404s
// instead of consolidating onto /returns.

import { describe, it, expect, vi, beforeEach } from "vitest";

const navMocks = vi.hoisted(() => ({
  permanentRedirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  permanentRedirect: navMocks.permanentRedirect,
}));

import RefundPolicyPage from "@/app/refund-policy/page";

beforeEach(() => {
  navMocks.permanentRedirect.mockClear();
});

describe("RefundPolicyPage", () => {
  it("calls permanentRedirect('/returns')", () => {
    expect(() => RefundPolicyPage()).toThrow(/NEXT_REDIRECT:\/returns/);
    expect(navMocks.permanentRedirect).toHaveBeenCalledWith("/returns");
    expect(navMocks.permanentRedirect).toHaveBeenCalledTimes(1);
  });

  it("uses permanentRedirect (308), not redirect (307) — link equity consolidates", () => {
    // The Wix Refund Policy URL has been live for years; a 307 wouldn't
    // signal cache/crawler consolidation. cfw-g6e (our-story) established
    // the same convention.
    try {
      RefundPolicyPage();
    } catch {
      // expected
    }
    expect(navMocks.permanentRedirect).toHaveBeenCalled();
  });
});
