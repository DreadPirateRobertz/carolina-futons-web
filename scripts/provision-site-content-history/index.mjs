#!/usr/bin/env node
// cfw-p4t (cfw-6qd.10 unblocker): provisions the SiteContentHistory Wix
// CMS collection so writeSiteContentHistory (src/lib/cms/site-content-
// history.ts) has somewhere to write. Without this, every owner edit
// silently no-ops the undo trail and the EditableText ↶ icon (cfw-plg)
// shows an empty versions list for every key.
//
// Idempotent. Safe to re-run. Mirrors the cfw-roi/cf-atze pattern
// (scripts/provision-site-content/index.mjs) so the operator's mental
// model stays consistent across owner-mode collections.
//
// No seed rows — history rows accrue at runtime as edits land;
// provisioning only stands up the collection schema.
//
// Run:
//   WIX_BACKEND_KEY=... WIX_PROVISION_SITE_ID=... \
//     npm run provision:site-content-history
//
// Dry-run (no API calls — prints planned operations):
//   npm run provision:site-content-history -- --dry-run

import { createClient, ApiKeyStrategy } from "@wix/sdk";
import * as dataCollections from "@wix/auto_sdk_data_collections";
import * as items from "@wix/wix-data-items-sdk";

const COLLECTION_ID = "SiteContentHistory";
const COLLECTION_DISPLAY_NAME = "Site Content History";

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");

function log(...parts) {
  console.log("[provision-site-content-history]", ...parts);
}
function err(...parts) {
  console.error("[provision-site-content-history][error]", ...parts);
}

function requireEnv(name) {
  const value = (process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(
      `Missing env var ${name}. See scripts/provision-site-content-history/README.md`,
    );
  }
  return value;
}

function buildClient() {
  const apiKey = requireEnv("WIX_BACKEND_KEY");
  const siteId = requireEnv("WIX_PROVISION_SITE_ID");
  return createClient({
    modules: { dataCollections, items },
    auth: ApiKeyStrategy({ apiKey, siteId }),
  });
}

const COLLECTION_DEF = {
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
        "SiteContent dotted-path key this row is a version OF (e.g. 'footer.tagline'). Indexed for the readSiteContentHistory eq('key') query.",
    },
    {
      key: "before",
      displayName: "Before",
      type: "TEXT",
      required: false,
      description:
        "Value BEFORE the edit that produced this history row — what the ↶ icon rolls back to. Empty when this row is the first version of a key.",
    },
    {
      key: "after",
      displayName: "After",
      type: "TEXT",
      required: true,
      description:
        "Value AFTER the edit that produced this history row — the post-sanitization value that was actually persisted to SiteContent.",
    },
    {
      key: "actorEmail",
      displayName: "Actor Email",
      type: "TEXT",
      required: true,
      description:
        "loginEmail from getOwnerSession() at the moment of the edit. Lets the viewer attribute changes to a specific owner.",
    },
  ],
  // Same permission shape as OwnerAuditLog: ANYONE read (the ↶ icon),
  // SITE_MEMBER insert (allowlisted owners writing under their member
  // tokens), ADMIN update/remove (history is append-only).
  permissions: {
    read: "ANYONE",
    insert: "SITE_MEMBER",
    update: "ADMIN",
    remove: "ADMIN",
  },
};

async function ensureCollection(client) {
  let existing = null;
  if (client) {
    try {
      existing = await client.dataCollections.getDataCollection(COLLECTION_ID);
    } catch (probeErr) {
      log(
        `SiteContentHistory collection not found (will create). Probe error: ${probeErr?.message ?? probeErr}`,
      );
    }
  }

  if (existing) {
    log(
      `SiteContentHistory collection already exists (id=${existing._id}). Skipping create.`,
    );
    return existing;
  }

  if (DRY_RUN) {
    log("DRY-RUN: would create collection:");
    log(JSON.stringify(COLLECTION_DEF, null, 2));
    return COLLECTION_DEF;
  }

  const created = await client.dataCollections.createDataCollection(COLLECTION_DEF);
  log(`Created SiteContentHistory collection (id=${created._id}).`);
  return created;
}

async function main() {
  if (DRY_RUN) {
    log("Running in DRY-RUN mode — no Wix API calls will be made.");
  }
  const client = DRY_RUN ? null : buildClient();
  await ensureCollection(client);
  log(DRY_RUN ? "DRY-RUN complete." : "Done.");
}

// Allow this module to be imported (for tests) without auto-running.
const isDirectRun = import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  main().catch((e) => {
    err(e?.stack ?? e?.message ?? String(e));
    process.exit(1);
  });
}

export {
  COLLECTION_ID,
  COLLECTION_DEF,
  buildClient,
  ensureCollection,
  main,
};
