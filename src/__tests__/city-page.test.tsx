import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import CityPage, {
  generateStaticParams,
  generateMetadata,
} from "@/app/near/[city-slug]/page";
import { SEO_CITIES, proximityLine, getCityBySlug } from "@/lib/seo/cities";

describe("generateStaticParams", () => {
  it("returns a slug for every city in SEO_CITIES", async () => {
    const params = await generateStaticParams();
    expect(params.length).toBe(SEO_CITIES.length);
    for (const city of SEO_CITIES) {
      expect(params).toContainEqual({ "city-slug": city.slug });
    }
  });

  it("includes all 8 required NC/SC cities", async () => {
    const params = await generateStaticParams();
    const slugs = params.map((p) => p["city-slug"]);
    for (const slug of [
      "asheville",
      "hendersonville",
      "charlotte",
      "raleigh",
      "greensboro",
      "greenville",
      "spartanburg",
      "columbia",
    ]) {
      expect(slugs).toContain(slug);
    }
  });
});

describe("generateMetadata", () => {
  it("includes the city name in the title", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ "city-slug": "asheville" }),
    });
    expect(String(meta.title)).toMatch(/asheville/i);
  });

  it("includes the city name in the description", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ "city-slug": "charlotte" }),
    });
    expect(String(meta.description)).toMatch(/charlotte/i);
  });

  it("includes a canonical URL with the slug", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ "city-slug": "asheville" }),
    });
    expect(String(meta.alternates?.canonical)).toMatch(/\/near\/asheville/);
  });

  it("returns a 404-style metadata for unknown slugs", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ "city-slug": "timbuktu" }),
    });
    expect(meta.robots).toMatchObject({ index: false });
  });

  it("unknown slug metadata has no canonical URL", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ "city-slug": "timbuktu" }),
    });
    expect(meta.alternates).toBeUndefined();
  });
});

describe("CityPage — Asheville", () => {
  const params = Promise.resolve({ "city-slug": "asheville" });

  it("renders H1 containing the city name", async () => {
    const ui = await CityPage({ params });
    render(ui);
    expect(
      screen.getByRole("heading", { level: 1, name: /asheville/i }),
    ).toBeTruthy();
  });

  it("renders a link to /shop", async () => {
    const ui = await CityPage({ params });
    render(ui);
    const shopLinks = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("href")?.startsWith("/shop"));
    expect(shopLinks.length).toBeGreaterThan(0);
  });

  it("renders the distance in miles from the store", async () => {
    const ui = await CityPage({ params });
    render(ui);
    const main = screen.getByRole("main");
    expect(main.textContent).toMatch(/20 miles/i);
  });

  it("renders the distance paragraph in the showroom section", async () => {
    const ui = await CityPage({ params });
    render(ui);
    expect(screen.getByText(/approximately 20 miles from asheville/i)).toBeTruthy();
  });

  it("embeds a JSON-LD script tag with FurnitureStore type", async () => {
    const ui = await CityPage({ params });
    const { container } = render(ui);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    let found = false;
    scripts.forEach((s) => {
      try {
        const data = JSON.parse(s.textContent ?? "");
        if (data["@type"] === "LocalBusiness" || data["@type"] === "FurnitureStore") {
          found = true;
        }
      } catch (err) {
        throw new Error(`Malformed JSON-LD: ${err}`);
      }
    });
    expect(found).toBe(true);
  });

  it("JSON-LD areaServed matches the requested city", async () => {
    const ui = await CityPage({ params });
    const { container } = render(ui);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    let areaServedName: string | undefined;
    scripts.forEach((s) => {
      try {
        const data = JSON.parse(s.textContent ?? "");
        if (data.areaServed) areaServedName = data.areaServed.name;
      } catch {
        // skip
      }
    });
    expect(areaServedName).toBe("Asheville");
  });
});

describe("CityPage — Hendersonville (zero-distance city)", () => {
  const params = Promise.resolve({ "city-slug": "hendersonville" });

  it("renders H1 containing Hendersonville", async () => {
    const ui = await CityPage({ params });
    render(ui);
    expect(
      screen.getByRole("heading", { level: 1, name: /hendersonville/i }),
    ).toBeTruthy();
  });

  it("renders the 'right here' proximity copy (not a miles count)", async () => {
    const ui = await CityPage({ params });
    render(ui);
    const main = screen.getByRole("main");
    expect(main.textContent).toMatch(/right here/i);
    expect(main.textContent).not.toMatch(/\d+ miles from our/i);
  });

  it("does not render the distance paragraph in the showroom section", async () => {
    const ui = await CityPage({ params });
    render(ui);
    expect(screen.queryByText(/approximately \d+ miles from hendersonville/i)).toBeNull();
  });
});

describe("CityPage — not found slug", () => {
  it("returns null for unknown slugs (dynamicParams=false handles real 404 at the framework level)", async () => {
    const result = await CityPage({
      params: Promise.resolve({ "city-slug": "nowhere-town" }),
    });
    expect(result).toBeNull();
  });
});

describe("SEO_CITIES data", () => {
  it("each city has slug, name, state, and distanceMiles", () => {
    for (const city of SEO_CITIES) {
      expect(city.slug).toBeTruthy();
      expect(city.name).toBeTruthy();
      expect(city.state).toMatch(/^(NC|SC)$/);
      expect(typeof city.distanceMiles).toBe("number");
    }
  });

  it("hendersonville is in the list", () => {
    const hendo = SEO_CITIES.find((c) => c.slug === "hendersonville");
    expect(hendo).toBeDefined();
    expect(hendo?.name).toBe("Hendersonville");
  });
});

describe("proximityLine", () => {
  it("returns 'right here' copy for distanceMiles === 0", () => {
    const hendo = getCityBySlug("hendersonville")!;
    expect(proximityLine(hendo)).toMatch(/right here/i);
  });

  it("returns miles copy for non-zero distance", () => {
    const asheville = getCityBySlug("asheville")!;
    expect(proximityLine(asheville)).toMatch(/20 miles/i);
  });
});

describe("getCityBySlug", () => {
  it("is case-insensitive", () => {
    expect(getCityBySlug("Asheville")).not.toBeNull();
    expect(getCityBySlug("CHARLOTTE")).not.toBeNull();
  });

  it("returns null for unknown slugs", () => {
    expect(getCityBySlug("nowhere")).toBeNull();
  });
});
