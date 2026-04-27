import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

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
