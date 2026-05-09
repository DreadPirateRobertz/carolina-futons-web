#!/usr/bin/env node
// cfw-p4t (cfw-6qd.11 unblocker): provisions the OwnerAuditLog Wix CMS
// collection so recordOwnerEdit (src/lib/admin/audit-log.ts) has somewhere
// to write. Without this, every owner edit silently no-ops the audit
// trail and /admin/audit (cfw-xlv) shows the "may not be provisioned"
// banner.
//
// Idempotent. Safe to re-run. Mirrors the cfw-roi/cf-atze pattern
// (scripts/provision-site-content/index.mjs) so the operator's mental
// model stays consistent across owner-mode collections.
//
// No seed rows — the audit log is append-only at runtime; provisioning
// only stands up the collection schema.
//
// Run:
//   WIX_BACKEND_KEY=... WIX_PROVISION_SITE_ID=... \
//     npm run provision:owner-audit-log
//
// Dry-run (no API calls — prints planned operations):
//   npm run provision:owner-audit-log -- --dry-run

import { createClient, ApiKeyStrategy } from "@wix/sdk";
import * as dataCollections from "@wix/auto_sdk_data_collections";
import * as items from "@wix/wix-data-items-sdk";

const COLLECTION_ID = "OwnerAuditLog";
const COLLECTION_DISPLAY_NAME = "Owner Audit Log";

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");

function log(...parts) {
  console.log("[provision-owner-audit-log]", ...parts);
}
function err(...parts) {
  console.error("[provision-owner-audit-log][error]", ...parts);
}

function requireEnv(name) {
  const value = (process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(
      `Missing env var ${name}. See scripts/provision-owner-audit-log/README.md`,
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
  displayField: "ts",
  fields: [
    {
      key: "ts",
      displayName: "Timestamp",
      type: "TEXT",
      required: true,
      description:
        "ISO-8601 timestamp written by recordOwnerEdit (src/lib/admin/audit-log.ts). Stored as TEXT not DATETIME so unmodified ISO strings round-trip cleanly via the @wix/wix-data-items-sdk JSON path.",
    },
    {
      key: "actorEmail",
      displayName: "Actor Email",
      type: "TEXT",
      required: true,
      description:
        "loginEmail from getOwnerSession() — Brenda's allowlisted owner address. Indexed for the /admin/audit ?actor= filter.",
    },
    {
      key: "action",
      displayName: "Action",
      type: "TEXT",
      required: true,
      description:
        "Edit category — 'edit' (text save), 'upload' (image upload), or 'swap' (product image swap). Indexed for the /admin/audit ?action= filter.",
    },
    {
      key: "target",
      displayName: "Target",
      type: "TEXT",
      required: true,
      description:
        "What was edited — SiteContent dotted-path key (e.g. 'footer.tagline') or productId for product image swaps.",
    },
    {
      key: "before",
      displayName: "Before",
      type: "TEXT",
      required: false,
      description:
        "Value before this edit. Empty when creating a row for the first time. Used by the /admin/audit Before column.",
    },
    {
      key: "after",
      displayName: "After",
      type: "TEXT",
      required: true,
      description:
        "Value after this edit. The post-sanitization value that was actually persisted (cfw-qyy + cfw-6qd.12).",
    },
  ],
  // Members with the OWNER_EMAILS allowlist write through the
  // /api/admin/site-content endpoint under their own member tokens; the
  // viewer reads via the unauthenticated client because the /admin/audit
  // route gate is the source of truth.
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
        `OwnerAuditLog collection not found (will create). Probe error: ${probeErr?.message ?? probeErr}`,
      );
    }
  }

  if (existing) {
    log(
      `OwnerAuditLog collection already exists (id=${existing._id}). Skipping create.`,
    );
    return existing;
  }

  if (DRY_RUN) {
    log("DRY-RUN: would create collection:");
    log(JSON.stringify(COLLECTION_DEF, null, 2));
    return COLLECTION_DEF;
  }

  const created = await client.dataCollections.createDataCollection(COLLECTION_DEF);
  log(`Created OwnerAuditLog collection (id=${created._id}).`);
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
