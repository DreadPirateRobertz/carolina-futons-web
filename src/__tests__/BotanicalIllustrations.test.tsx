import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { SHOP_CATEGORIES } from "@/lib/shop/categories";

import { BotanicalMountainSkyline } from "@/components/illustrations/BotanicalMountainSkyline";
import { BotanicalTimeline } from "@/components/illustrations/BotanicalTimeline";
import { BotanicalFooterDivider } from "@/components/illustrations/BotanicalFooterDivider";
import { FutonsCategory } from "@/components/illustrations/FutonsCategory";
import { MurphyCategory } from "@/components/illustrations/MurphyCategory";
import { PlatformCategory } from "@/components/illustrations/PlatformCategory";
import { MattressesCategory } from "@/components/illustrations/MattressesCategory";
import { BotanicalDesignARoom } from "@/components/illustrations/BotanicalDesignARoom";
import { BotanicalGuides } from "@/components/illustrations/BotanicalGuides";
import { BotanicalVisitUs } from "@/components/illustrations/BotanicalVisitUs";
import { BotanicalReviews } from "@/components/illustrations/BotanicalReviews";
import { getCurrentSeason, SEASONS } from "@/components/illustrations/botanical";
import type { Season } from "@/components/illustrations/botanical";

const ALL_SEASONS: Season[] = ["spring", "summer", "fall", "winter"];

describe("getCurrentSeason", () => {
  it("returns one of the four valid seasons", () => {
    expect(ALL_SEASONS).toContain(getCurrentSeason());
  });

  describe("month boundaries", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const cases: Array<[number, Season]> = [
      [0, "winter"],
      [1, "winter"],
      [2, "spring"],
      [4, "spring"],
      [5, "summer"],
      [7, "summer"],
      [8, "fall"],
      [10, "fall"],
      [11, "winter"],
    ];

    for (const [month, expected] of cases) {
      it(`month ${month} → ${expected}`, () => {
        vi.setSystemTime(new Date(2024, month, 15));
        expect(getCurrentSeason()).toBe(expected);
      });
    }
  });
});

describe("SEASONS palette", () => {
  it("each season has all required palette keys", () => {
    for (const s of ALL_SEASONS) {
      const p = SEASONS[s];
      expect(p.paper).toMatch(/^#/);
      expect(p.ink).toMatch(/^#/);
      expect(p.accent).toMatch(/^#/);
      expect(p.accent2).toMatch(/^#/);
      expect(p.wash).toMatch(/^#/);
      expect(p.leaf).toMatch(/^#/);
      expect(p.bloom).toMatch(/^#/);
    }
  });
});

describe("BotanicalMountainSkyline", () => {
  it("renders an SVG with the mountain-skyline slot", () => {
    const { container } = render(<BotanicalMountainSkyline />);
    expect(container.querySelector("[data-slot='mountain-skyline']")).not.toBeNull();
  });

  it("renders for each season without throwing", () => {
    for (const s of ALL_SEASONS) {
      expect(() => render(<BotanicalMountainSkyline season={s} />)).not.toThrow();
    }
  });
});

describe("BotanicalTimeline", () => {
  it("renders an SVG with milestone years visible", () => {
    const { getByText } = render(<BotanicalTimeline />);
    expect(getByText("1991")).toBeInTheDocument();
    expect(getByText("2005")).toBeInTheDocument();
    expect(getByText("2015")).toBeInTheDocument();
    expect(getByText("2026")).toBeInTheDocument();
  });

  it("renders for each season without throwing", () => {
    for (const s of ALL_SEASONS) {
      expect(() => render(<BotanicalTimeline season={s} />)).not.toThrow();
    }
  });
});

describe("BotanicalFooterDivider", () => {
  it("renders an SVG without throwing", () => {
    const { container } = render(<BotanicalFooterDivider />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

describe("Category illustrations — smoke (all seasons)", () => {
  const components = [
    ["FutonsCategory", FutonsCategory],
    ["MurphyCategory", MurphyCategory],
    ["PlatformCategory", PlatformCategory],
    ["MattressesCategory", MattressesCategory],
  ] as const;

  for (const [name, Comp] of components) {
    it(`${name} renders for each season without throwing`, () => {
      for (const s of ALL_SEASONS) {
        expect(() => render(<Comp season={s} />)).not.toThrow();
      }
    });

    it(`${name} renders an SVG`, () => {
      const { container } = render(<Comp />);
      expect(container.querySelector("svg")).not.toBeNull();
    });
  }
});

describe("Spot illustrations — smoke (all seasons)", () => {
  const spots = [
    ["BotanicalDesignARoom", BotanicalDesignARoom],
    ["BotanicalGuides", BotanicalGuides],
    ["BotanicalVisitUs", BotanicalVisitUs],
    ["BotanicalReviews", BotanicalReviews],
  ] as const;

  for (const [name, Comp] of spots) {
    it(`${name} renders for each season without throwing`, () => {
      for (const s of ALL_SEASONS) {
        expect(() => render(<Comp season={s} />)).not.toThrow();
      }
    });
  }
});

describe("MattressesCategory — instanceKey deduplication", () => {
  it("different instanceKeys produce distinct filter IDs", () => {
    const { container: c1 } = render(
      <MattressesCategory season="summer" instanceKey="mattresses" />,
    );
    const { container: c2 } = render(
      <MattressesCategory season="summer" instanceKey="mattresses-sale" />,
    );
    const id1 = c1.querySelector("filter")?.id;
    const id2 = c2.querySelector("filter")?.id;
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });
});

describe("CATEGORY_ILLUSTRATION coverage", () => {
  const ILLUSTRATED_SLUGS = new Set([
    "futon-frames",
    "murphy-cabinet-beds",
    "platform-beds",
    "mattresses",
    "mattresses-sale",
  ]);

  it("every SHOP_CATEGORY slug has an assigned illustration", () => {
    for (const cat of SHOP_CATEGORIES) {
      expect(
        ILLUSTRATED_SLUGS.has(cat.slug),
        `${cat.slug} is missing from CATEGORY_ILLUSTRATION`,
      ).toBe(true);
    }
  });
});
