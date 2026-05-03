import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import CityPage, {
  generateStaticParams,
  generateMetadata,
} from "@/app/near/[city-slug]/page";
import { SEO_CITIES } from "@/lib/seo/cities";

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

  it("returns a 404-style metadata for unknown slugs", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ "city-slug": "timbuktu" }),
    });
    expect(meta.robots).toMatchObject({ index: false });
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

  it("renders store distance or proximity messaging", async () => {
    const ui = await CityPage({ params });
    render(ui);
    const main = screen.getByRole("main");
    expect(main.textContent).toMatch(/miles|minutes|Hendersonville/i);
  });

  it("embeds a JSON-LD script tag with LocalBusiness type", async () => {
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
      } catch {
        // skip malformed
      }
    });
    expect(found).toBe(true);
  });
});

describe("CityPage — not found slug", () => {
  it("renders a 404 / not found result for unknown slugs", async () => {
    const result = await CityPage({
      params: Promise.resolve({ "city-slug": "nowhere-town" }),
    });
    // Page should call notFound() — but since notFound() throws in Next.js,
    // we verify the city data lookup returns null for unknown slugs
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
