import { BUSINESS } from "@/lib/business/contact-info";

export type SeoCity = {
  slug: string;
  name: string;
  state: "NC" | "SC";
  distanceMiles: number;
};

export const SEO_CITIES: ReadonlyArray<SeoCity> = [
  { slug: "hendersonville", name: "Hendersonville", state: "NC", distanceMiles: 0 },
  { slug: "asheville",      name: "Asheville",      state: "NC", distanceMiles: 20  },
  { slug: "charlotte",      name: "Charlotte",      state: "NC", distanceMiles: 110 },
  { slug: "raleigh",        name: "Raleigh",        state: "NC", distanceMiles: 280 },
  { slug: "greensboro",     name: "Greensboro",     state: "NC", distanceMiles: 175 },
  { slug: "greenville",     name: "Greenville",     state: "SC", distanceMiles: 60  },
  { slug: "spartanburg",    name: "Spartanburg",    state: "SC", distanceMiles: 80  },
  { slug: "columbia",       name: "Columbia",       state: "SC", distanceMiles: 160 },
];

export function getCityBySlug(slug: string): SeoCity | null {
  return SEO_CITIES.find((c) => c.slug === slug.toLowerCase().trim()) ?? null;
}

export function proximityLine(city: SeoCity): string {
  if (city.distanceMiles === 0) {
    return `Visit our showroom right here in ${BUSINESS.city}, ${BUSINESS.state}.`;
  }
  return `Just ${city.distanceMiles} miles from our ${BUSINESS.city} showroom — order online or visit us in person.`;
}
