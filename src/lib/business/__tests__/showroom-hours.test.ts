import { afterEach, describe, expect, it, vi } from "vitest";

// cf-7pk0 F2: hours helper that reads the canonical visit.hours.{sun-tue,
// wed-sat} SiteContent keys so /contact + /visit can't drift. Pre-helper,
// /contact line 97 hardcoded "Wednesday through Saturday, 10 am–5 pm"
// while /visit's published-schedule fallback (Brenda #475) said wed-sat
// is "Closed" — an ACTIVE production contradiction (customer arrives
// Saturday to a closed showroom). The helper centralizes the read so
// both surfaces stay in sync with whatever Brenda last edited.

const mockGetSiteContent = vi.fn();
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: (...args: unknown[]) => mockGetSiteContent(...args),
}));

afterEach(() => {
  mockGetSiteContent.mockReset();
});

describe("showroom-hours — canonical fetch", () => {
  it("getShowroomHoursSunTue reads visit.hours.sun-tue from SiteContent", async () => {
    mockGetSiteContent.mockResolvedValueOnce("11 am – 6 pm");
    const { getShowroomHoursSunTue } = await import("../showroom-hours");
    const result = await getShowroomHoursSunTue();
    expect(result).toBe("11 am – 6 pm");
    expect(mockGetSiteContent).toHaveBeenCalledWith(
      "visit.hours.sun-tue",
      "10 am – 5 pm",
    );
  });

  it("getShowroomHoursSunTue falls back to '10 am – 5 pm' when SiteContent is empty", async () => {
    // The helper passes a fallback into getSiteContent; SiteContent's
    // contract is to return the fallback on missing/error. Simulate that
    // by having the mock return the fallback arg.
    mockGetSiteContent.mockImplementation(async (_key, fallback) => fallback);
    const { getShowroomHoursSunTue } = await import("../showroom-hours");
    const result = await getShowroomHoursSunTue();
    expect(result).toBe("10 am – 5 pm");
  });

  it("getShowroomHoursWedSat reads visit.hours.wed-sat from SiteContent", async () => {
    mockGetSiteContent.mockResolvedValueOnce("12 pm – 4 pm");
    const { getShowroomHoursWedSat } = await import("../showroom-hours");
    const result = await getShowroomHoursWedSat();
    expect(result).toBe("12 pm – 4 pm");
    expect(mockGetSiteContent).toHaveBeenCalledWith(
      "visit.hours.wed-sat",
      "Closed",
    );
  });

  it("getShowroomHoursWedSat falls back to 'Closed' when SiteContent is empty (Brenda #475 published schedule)", async () => {
    mockGetSiteContent.mockImplementation(async (_key, fallback) => fallback);
    const { getShowroomHoursWedSat } = await import("../showroom-hours");
    const result = await getShowroomHoursWedSat();
    expect(result).toBe("Closed");
  });
});

describe("showroom-hours — getShowroomScheduleLine", () => {
  // The /contact page needs a short inline summary like
  //   "Open Sunday through Tuesday, 10 am – 5 pm. Closed Wednesday through Saturday."
  // composed from the two canonical keys. The helper builds the sentence
  // so /contact doesn't reconstruct it from a stale hardcoded snapshot.

  it("composes both day-ranges when both have open hours", async () => {
    mockGetSiteContent.mockImplementation(async (key, fallback) => {
      if (key === "visit.hours.sun-tue") return "10 am – 5 pm";
      if (key === "visit.hours.wed-sat") return "11 am – 6 pm";
      return fallback;
    });
    const { getShowroomScheduleLine } = await import("../showroom-hours");
    const result = await getShowroomScheduleLine();
    expect(result).toBe(
      "Open Sunday through Tuesday, 10 am – 5 pm. Open Wednesday through Saturday, 11 am – 6 pm.",
    );
  });

  it("renders the Closed half correctly when wed-sat is 'Closed' (current published schedule)", async () => {
    mockGetSiteContent.mockImplementation(async (_key, fallback) => fallback);
    const { getShowroomScheduleLine } = await import("../showroom-hours");
    const result = await getShowroomScheduleLine();
    // /visit's STORE_HOURS_FALLBACK currently says wed-sat is "Closed".
    // The schedule line MUST reflect that — not the stale "Wed-Sat, 10-5"
    // copy that lived in /contact line 97-98.
    expect(result).toBe(
      "Open Sunday through Tuesday, 10 am – 5 pm. Closed Wednesday through Saturday.",
    );
  });

  it("renders only the open half when sun-tue is Closed", async () => {
    mockGetSiteContent.mockImplementation(async (key, fallback) => {
      if (key === "visit.hours.sun-tue") return "Closed";
      if (key === "visit.hours.wed-sat") return "10 am – 5 pm";
      return fallback;
    });
    const { getShowroomScheduleLine } = await import("../showroom-hours");
    const result = await getShowroomScheduleLine();
    expect(result).toBe(
      "Closed Sunday through Tuesday. Open Wednesday through Saturday, 10 am – 5 pm.",
    );
  });

  it("renders 'Closed' for both halves when both are Closed", async () => {
    mockGetSiteContent.mockImplementation(async (key) => {
      if (key === "visit.hours.sun-tue") return "Closed";
      if (key === "visit.hours.wed-sat") return "Closed";
      return "";
    });
    const { getShowroomScheduleLine } = await import("../showroom-hours");
    const result = await getShowroomScheduleLine();
    expect(result).toBe(
      "Closed Sunday through Tuesday. Closed Wednesday through Saturday.",
    );
  });
});
