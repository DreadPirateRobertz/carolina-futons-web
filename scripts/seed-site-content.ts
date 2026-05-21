#!/usr/bin/env npx tsx
/**
 * cfw-66o.9: Seed the SiteContent Wix CMS collection with canonical
 * fallback values for all owner-editable copy keys.
 *
 * Covers:
 *   §1 — 26 already-live keys (from provision-site-content/seed-data.json)
 *   §2 — 24 proposed keys from docs/site-content-audit.md §2a-§2f
 *
 * Semantics: UPSERT. Unlike provision-site-content (which inserts-only and
 * preserves Brenda's edits), this script overwrites existing values with the
 * declared defaults. Use it to reset the collection to a known-good baseline
 * or to initialise keys that don't yet have a CMS row.
 *
 * Usage:
 *   WIX_BACKEND_KEY=<key> WIX_PROVISION_SITE_ID=<siteId> \
 *     npx tsx scripts/seed-site-content.ts
 *
 * Dry-run (logs planned operations, makes no API calls):
 *   npx tsx scripts/seed-site-content.ts --dry-run
 *
 * Idempotent: safe to run multiple times. Each run brings the collection to
 * exactly the state declared below.
 */

import { createClient, ApiKeyStrategy } from "@wix/sdk";
import * as items from "@wix/wix-data-items-sdk";

// ── Types ─────────────────────────────────────────────────────────────

type SeedRow = {
  key: string;
  value: string;
};

// ── Seed data ─────────────────────────────────────────────────────────
//
// §1: Already-live keys wired to getSiteContent() across the codebase.
//     Source: scripts/provision-site-content/seed-data.json
//
// §2: Proposed keys from docs/site-content-audit.md §2a-§2f.
//     Values are the current hardcoded fallbacks. Once each call site is
//     migrated to getSiteContent(), the CMS row takes effect immediately.

const SEED_ROWS: SeedRow[] = [
  // ── §1: Footer ─────────────────────────────────────────────────────
  { key: "footer.tagline",            value: "Quality futons since 1991" },
  { key: "footer.showroom-hours.label", value: "Showroom hours: Sun–Tue, 10am–5pm" },
  { key: "footer.copyright-line",     value: "© {year} Carolina Futons. Hendersonville, NC." },

  // ── §1: Visit page ─────────────────────────────────────────────────
  { key: "visit.intro.heading",       value: "Visit Us" },
  { key: "visit.intro.body",          value: "Come try it in person. Our Hendersonville showroom has every frame, mattress, and Murphy bed we sell — no commission pressure, just honest answers." },
  { key: "visit.location.heading",    value: "Location" },
  { key: "visit.hours.heading",       value: "Store Hours" },
  { key: "visit.hours.sun-tue",       value: "10 am – 5 pm" },
  { key: "visit.hours.wed-sat",       value: "Closed" },
  { key: "visit.directions-button.label", value: "Get directions" },
  { key: "visit.cta.heading",         value: "Ready to shop?" },
  { key: "visit.cta.body",            value: "Browse online first, then come in and try everything." },
  { key: "visit.cta.button-label",    value: "Browse all products" },

  // ── §1: Announcement bar ───────────────────────────────────────────
  { key: "announcement.rotation.0.message", value: "Free white-glove delivery on orders over $1,500" },
  { key: "announcement.rotation.1.message", value: "10-year warranty on all hardwood futon frames" },
  { key: "announcement.rotation.2.message", value: "Family-owned since 1991 · Hendersonville, NC" },
  { key: "announcement.rotation.3.message", value: "Free fabric swatches — find your perfect match" },
  { key: "announcement.rotation.3.cta-label", value: "Order free swatches" },
  { key: "announcement.rotation.3.cta-href", value: "/swatch-request" },
  { key: "announcement.rotation.4.message", value: "Assembly included with every delivery" },

  // ── §1: Home — filter-first hero ───────────────────────────────────
  { key: "home.filter-first.eyebrow", value: "Family owned · Hendersonville, NC" },
  { key: "home.filter-first.headline", value: "Find your perfect futon" },
  { key: "home.filter-first.subhead", value: "Choose from our selection of high-quality futon frames, mattresses, and Murphy cabinet beds. Built to last, priced to fit your life." },

  // ── §1: Home — value props (cfw-34q) ──────────────────────────────
  { key: "home.value-props.0.title",  value: "Hardwood frames" },
  { key: "home.value-props.0.body",   value: "Every frame is solid hardwood — not MDF, not particle board." },
  { key: "home.value-props.1.title",  value: "700+ fabrics" },
  { key: "home.value-props.1.body",   value: "Free swatches mailed to your door before you commit." },
  { key: "home.value-props.2.title",  value: "White-glove delivery" },
  { key: "home.value-props.2.body",   value: "We set it up, haul away the packaging. No assembly headaches." },

  // ── §2a: Category descriptions (P1) ───────────────────────────────
  { key: "shop.futon-frames.description",      value: "Choose from twin, full, or queen hardwood frames, with varying seat heights, finishes, and conversion mechanisms. Some models offer chair, full, and queen chairs with ottoman options." },
  { key: "shop.murphy-cabinet-beds.description", value: "Cabinet beds that fold away without hardware in the wall." },
  { key: "shop.platform-beds.description",     value: "Low-profile solid-wood platform beds." },
  { key: "shop.mattresses.description",        value: "Futon mattresses and bed mattresses." },
  { key: "shop.sofa-beds.description",         value: "Convertible sofa beds — seat by day, guest bed by night." },
  { key: "shop.sale.description",              value: "Discounted futons, beds, and mattresses — while supplies last." },
  { key: "shop.mattresses-sale.description",   value: "Current mattress promotions." },

  // ── §2b: Category empty-state copy (P1) ───────────────────────────
  { key: "shop.sale.empty-state",          value: "No items are on sale right now. Check back soon." },
  { key: "shop.mattresses-sale.empty-state", value: "No mattresses are on sale right now. Check back soon." },

  // ── §2c: Category card subtitles on /shop (P2) ────────────────────
  { key: "shop.futon-frames.subtitle",       value: "Solid hardwood" },
  { key: "shop.murphy-cabinet-beds.subtitle", value: "Space-saving" },
  { key: "shop.platform-beds.subtitle",      value: "Low & modern" },
  { key: "shop.mattresses.subtitle",         value: "Made in USA" },
  { key: "shop.mattresses-sale.subtitle",    value: "On sale now" },

  // ── §2d: Shop index page copy (P2) ────────────────────────────────
  { key: "shop.index.subhead",          value: "Pick a category to browse." },
  { key: "shop.shop-the-room.eyebrow",  value: "Shop the room" },
  { key: "shop.shop-the-room.heading",  value: "Or jump straight in" },

  // ── §2e: Futon frames featured-row copy (P2) ──────────────────────
  { key: "shop.futon-frames.featured.eyebrow", value: "Editor's picks" },
  { key: "shop.futon-frames.featured.heading", value: "Where most people start" },
  { key: "shop.futon-frames.featured.body",    value: "Three frames that cover the common questions — daily-use durability, conversion mechanism, and finish. Sit on them in the showroom or order with our 100-night guarantee." },

  // ── §2f: Social media URLs (P3) ───────────────────────────────────
  { key: "footer.social.facebook-href",  value: "https://www.facebook.com/carolinafutons" },
  { key: "footer.social.instagram-href", value: "https://www.instagram.com/carolinafutons" },
  { key: "footer.social.tiktok-href",    value: "https://www.tiktok.com/@carolinafutons" },
  { key: "footer.social.pinterest-href", value: "https://www.pinterest.com/carolinafutons" },
];

// ── Config ────────────────────────────────────────────────────────────

const COLLECTION_ID = "SiteContent";
const DRY_RUN = process.argv.includes("--dry-run");

function log(...parts: unknown[]): void {
  console.log("[seed-site-content]", ...parts);
}
function logErr(...parts: unknown[]): void {
  console.error("[seed-site-content][error]", ...parts);
}

function requireEnv(name: string): string {
  const value = (process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(
      `Missing env var ${name}.\n` +
      `Run: WIX_BACKEND_KEY=<key> WIX_PROVISION_SITE_ID=<siteId> npx tsx scripts/seed-site-content.ts`,
    );
  }
  return value;
}

// ── Wix client ────────────────────────────────────────────────────────

function buildClient() {
  const apiKey = requireEnv("WIX_BACKEND_KEY");
  const siteId = requireEnv("WIX_PROVISION_SITE_ID");
  return createClient({
    modules: { items },
    auth: ApiKeyStrategy({ apiKey, siteId }),
  });
}

type WixClient = ReturnType<typeof buildClient>;

// ── Upsert logic ──────────────────────────────────────────────────────

async function findByKey(
  client: WixClient,
  key: string,
): Promise<{ _id: string } | null> {
  const result = await client.items
    .query(COLLECTION_ID)
    .eq("key", key)
    .limit(1)
    .find();
  const item = result.items[0];
  return item?._id ? { _id: item._id } : null;
}

async function upsertRow(client: WixClient, row: SeedRow): Promise<"inserted" | "updated"> {
  const existing = await findByKey(client, row.key);
  if (existing) {
    await client.items.update(COLLECTION_ID, {
      _id: existing._id,
      key: row.key,
      value: row.value,
    });
    return "updated";
  }
  await client.items.insert(COLLECTION_ID, { key: row.key, value: row.value });
  return "inserted";
}

// ── Main ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (DRY_RUN) {
    log("DRY-RUN mode — no Wix API calls will be made.");
  }

  log(`${SEED_ROWS.length} rows declared (§1 live + §2 proposed).`);

  if (DRY_RUN) {
    for (const row of SEED_ROWS) {
      log(`DRY-RUN: would upsert key=${JSON.stringify(row.key)} value=${JSON.stringify(row.value).slice(0, 60)}…`);
    }
    log(`DRY-RUN complete. ${SEED_ROWS.length} rows would be upserted.`);
    return;
  }

  const client = buildClient();
  let inserted = 0;
  let updated = 0;

  for (const row of SEED_ROWS) {
    const action = await upsertRow(client, row);
    if (action === "inserted") {
      log(`Inserted: ${row.key}`);
      inserted++;
    } else {
      log(`Updated:  ${row.key}`);
      updated++;
    }
  }

  log(`Done. Inserted=${inserted} Updated=${updated} Total=${inserted + updated}`);
}

main().catch((e: unknown) => {
  logErr((e instanceof Error ? e.stack : null) ?? String(e));
  process.exit(1);
});
