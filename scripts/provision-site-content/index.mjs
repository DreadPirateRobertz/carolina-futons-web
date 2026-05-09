#!/usr/bin/env node
// cfw-roi (cf-atze): provisions the SiteContent Wix CMS collection + seed
// rows so Brenda can edit owner-facing copy without bothering engineering.
//
// Idempotent. Safe to re-run. The script:
//   1. Creates the SiteContent collection if it doesn't exist (fields:
//      key TEXT unique, value RICH_TEXT).
//   2. Inserts each seed row from ./seed-data.json that isn't already
//      present (matched by `key`). Existing rows are not overwritten —
//      Brenda's edits always win.
//
// Run:
//   WIX_BACKEND_KEY=... WIX_PROVISION_SITE_ID=... \
//     npm run provision:site-content
//
// Dry-run (no API calls — prints planned operations + seed shape):
//   npm run provision:site-content -- --dry-run
//
// Production reader: src/lib/cms/site-content.ts. The reader fails open
// (returns the caller's fallback) when the collection is missing or a row
// is absent, so this script is purely additive — it can run before or
// after the cf-n7ni / cf-68w4 / cf-h21g refactors land.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createClient, ApiKeyStrategy } from "@wix/sdk";
import * as dataCollections from "@wix/auto_sdk_data_collections";
import * as items from "@wix/wix-data-items-sdk";

const COLLECTION_ID = "SiteContent";
const COLLECTION_DISPLAY_NAME = "Site Content";

const here = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = join(here, "seed-data.json");

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");

function log(...parts) {
  console.log("[provision-site-content]", ...parts);
}
function err(...parts) {
  console.error("[provision-site-content][error]", ...parts);
}

function requireEnv(name) {
  const value = (process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(
      `Missing env var ${name}. See scripts/provision-site-content/README.md`,
    );
  }
  return value;
}

async function loadSeed() {
  const raw = await readFile(SEED_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.rows)) {
    throw new Error(`seed-data.json: missing or non-array "rows"`);
  }
  const rows = parsed.rows.map((r) => ({ key: r.key, value: r.value }));
  // Defensive — provisioning should never write malformed seed data.
  for (const row of rows) {
    if (typeof row.key !== "string" || row.key.length === 0) {
      throw new Error(`seed-data.json: row missing string "key": ${JSON.stringify(row)}`);
    }
    if (typeof row.value !== "string" || row.value.length === 0) {
      throw new Error(`seed-data.json: row missing string "value": ${JSON.stringify(row)}`);
    }
  }
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.key)) {
      throw new Error(`seed-data.json: duplicate key "${row.key}"`);
    }
    seen.add(row.key);
  }
  return rows;
}

function buildClient() {
  const apiKey = requireEnv("WIX_BACKEND_KEY");
  const siteId = requireEnv("WIX_PROVISION_SITE_ID");
  return createClient({
    modules: { dataCollections, items },
    auth: ApiKeyStrategy({ apiKey, siteId }),
  });
}

async function ensureCollection(client) {
  // Probe — getDataCollection throws on missing. We treat any failure to
  // fetch as "not found" and attempt to create. Wix returns 409 on a
  // duplicate create, which surfaces as a clear error to the operator.
  let existing = null;
  if (client) {
    try {
      existing = await client.dataCollections.getDataCollection(COLLECTION_ID);
    } catch (probeErr) {
      log(`SiteContent collection not found (will create). Probe error: ${probeErr?.message ?? probeErr}`);
    }
  }

  if (existing) {
    log(`SiteContent collection already exists (id=${existing._id}). Skipping create.`);
    return existing;
  }

  const collectionDef = {
    _id: COLLECTION_ID,
    displayName: COLLECTION_DISPLAY_NAME,
    displayField: "key",
    fields: [
      {
        key: "key",
        displayName: "Key",
        type: "TEXT",
        required: true,
        description:
          "Dotted-path identifier read by getSiteContent (e.g. 'footer.tagline'). Lowercase, hyphenated segments. Do not rename — the storefront is reading by this exact string.",
      },
      {
        key: "value",
        displayName: "Value",
        type: "RICH_TEXT",
        required: true,
        description: "Owner-editable copy. Rendered server-side via getSiteContent(key, fallback).",
      },
    ],
    // Site-member-readable, admin-only writes — Brenda edits via the Wix
    // CMS dashboard (Path A fallback) or the inline pencils on
    // carolinafutons.com (Path B, cfw-6qd). Neither path needs anonymous
    // write.
    permissions: {
      read: "ANYONE",
      insert: "ADMIN",
      update: "ADMIN",
      remove: "ADMIN",
    },
  };

  if (DRY_RUN) {
    log("DRY-RUN: would create collection:", JSON.stringify(collectionDef, null, 2));
    return collectionDef;
  }

  const created = await client.dataCollections.createDataCollection(collectionDef);
  log(`Created SiteContent collection (id=${created._id}).`);
  return created;
}

async function findExistingByKey(client, key) {
  const result = await client.items
    .query(COLLECTION_ID)
    .eq("key", key)
    .limit(1)
    .find();
  return result.items[0] ?? null;
}

async function seedRows(client, rows) {
  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    if (DRY_RUN) {
      log(`DRY-RUN: would insert {key: ${JSON.stringify(row.key)}, value: ${JSON.stringify(row.value).slice(0, 60)}…}`);
      created += 1;
      continue;
    }
    const existing = await findExistingByKey(client, row.key);
    if (existing) {
      skipped += 1;
      log(`Row already present, skipping: ${row.key}`);
      continue;
    }
    await client.items.insert(COLLECTION_ID, { key: row.key, value: row.value });
    created += 1;
    log(`Inserted: ${row.key}`);
  }
  return { created, skipped };
}

async function main() {
  if (DRY_RUN) {
    log("Running in DRY-RUN mode — no Wix API calls will be made.");
  }
  const rows = await loadSeed();
  log(`Loaded ${rows.length} seed rows from ${SEED_PATH}`);

  const client = DRY_RUN ? null : buildClient();
  if (!DRY_RUN) {
    await ensureCollection(client);
    const stats = await seedRows(client, rows);
    log(`Done. Inserted=${stats.created} Skipped=${stats.skipped}`);
  } else {
    // Dry-run still walks the planned operations so the operator can
    // review before applying.
    await ensureCollection(null);
    await seedRows(null, rows);
    log(`DRY-RUN complete. ${rows.length} rows would be considered for insertion.`);
  }
}

main().catch((e) => {
  err(e?.stack ?? e?.message ?? String(e));
  process.exit(1);
});
