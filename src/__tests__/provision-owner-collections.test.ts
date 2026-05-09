import { describe, it, expect } from "vitest";

// cfw-p4t: structural validation for the two owner-mode provisioning
// scripts. The .mjs scripts run outside the Next runtime so we can't
// directly exercise their network paths from vitest, but we CAN import
// their exported COLLECTION_DEF + ensureCollection and pin the schema
// shape that recordOwnerEdit / writeSiteContentHistory depend on.
//
// Failures here indicate a provisioner whose schema diverged from what
// the runtime writers expect — one of:
//   - a field was renamed in the script but not in the writer
//   - permissions changed in a way that would block member writes
//   - the collection ID changed (production rows would be orphaned)

import {
  COLLECTION_ID as AUDIT_COLLECTION_ID,
  COLLECTION_DEF as AUDIT_DEF,
  ensureCollection as ensureAuditCollection,
} from "../../scripts/provision-owner-audit-log/index.mjs";
import {
  COLLECTION_ID as HISTORY_COLLECTION_ID,
  COLLECTION_DEF as HISTORY_DEF,
  ensureCollection as ensureHistoryCollection,
} from "../../scripts/provision-site-content-history/index.mjs";

describe("OwnerAuditLog provisioner — cfw-p4t", () => {
  it("collection id matches what recordOwnerEdit writes to", () => {
    expect(AUDIT_COLLECTION_ID).toBe("OwnerAuditLog");
    expect(AUDIT_DEF._id).toBe("OwnerAuditLog");
  });

  it("includes every field recordOwnerEdit writes", () => {
    const fieldKeys = AUDIT_DEF.fields.map((f) => f.key);
    expect(fieldKeys).toEqual(
      expect.arrayContaining([
        "ts",
        "actorEmail",
        "action",
        "target",
        "before",
        "after",
      ]),
    );
  });

  it("required-ness matches recordOwnerEdit's contract (before is optional, others required)", () => {
    const required = AUDIT_DEF.fields
      .filter((f) => f.required)
      .map((f) => f.key)
      .sort();
    expect(required).toEqual(
      ["action", "actorEmail", "after", "target", "ts"].sort(),
    );
    expect(
      AUDIT_DEF.fields.find((f) => f.key === "before")?.required,
    ).toBe(false);
  });

  it("permissions allow site-member insert + anyone read (matches cfw-xlv viewer)", () => {
    expect(AUDIT_DEF.permissions).toEqual({
      read: "ANYONE",
      insert: "SITE_MEMBER",
      update: "ADMIN",
      remove: "ADMIN",
    });
  });

  it("ensureCollection returns the existing collection when probe succeeds (idempotent)", async () => {
    const stub = {
      dataCollections: {
        getDataCollection: async () => ({ _id: "OwnerAuditLog", existing: true }),
        createDataCollection: async () => {
          throw new Error("must NOT call create when collection exists");
        },
      },
    };
    const result = await ensureAuditCollection(stub);
    expect(result).toMatchObject({ _id: "OwnerAuditLog", existing: true });
  });

  it("ensureCollection creates the collection when probe throws (first run)", async () => {
    let createdWith: unknown = null;
    const stub = {
      dataCollections: {
        getDataCollection: async () => {
          throw new Error("not found");
        },
        createDataCollection: async (def: unknown) => {
          createdWith = def;
          return { _id: "OwnerAuditLog", created: true };
        },
      },
    };
    const result = await ensureAuditCollection(stub);
    expect(result).toMatchObject({ created: true });
    expect(createdWith).toMatchObject({
      _id: "OwnerAuditLog",
      displayName: "Owner Audit Log",
    });
  });
});

describe("SiteContentHistory provisioner — cfw-p4t", () => {
  it("collection id matches what writeSiteContentHistory writes to", () => {
    expect(HISTORY_COLLECTION_ID).toBe("SiteContentHistory");
    expect(HISTORY_DEF._id).toBe("SiteContentHistory");
  });

  it("includes every field writeSiteContentHistory writes", () => {
    const fieldKeys = HISTORY_DEF.fields.map((f) => f.key);
    expect(fieldKeys).toEqual(
      expect.arrayContaining(["key", "before", "after", "actorEmail"]),
    );
  });

  it("required-ness matches the writer contract (before is optional)", () => {
    const required = HISTORY_DEF.fields
      .filter((f) => f.required)
      .map((f) => f.key)
      .sort();
    expect(required).toEqual(["actorEmail", "after", "key"]);
    expect(
      HISTORY_DEF.fields.find((f) => f.key === "before")?.required,
    ).toBe(false);
  });

  it("permissions match the OwnerAuditLog shape (consistent owner-mode storage)", () => {
    expect(HISTORY_DEF.permissions).toEqual(AUDIT_DEF.permissions);
  });

  it("ensureCollection skips create when probe finds an existing collection", async () => {
    const stub = {
      dataCollections: {
        getDataCollection: async () => ({
          _id: "SiteContentHistory",
          existing: true,
        }),
        createDataCollection: async () => {
          throw new Error("must NOT call create when collection exists");
        },
      },
    };
    const result = await ensureHistoryCollection(stub);
    expect(result).toMatchObject({ existing: true });
  });

  it("ensureCollection creates the collection when probe throws", async () => {
    let createdWith: unknown = null;
    const stub = {
      dataCollections: {
        getDataCollection: async () => {
          throw new Error("not found");
        },
        createDataCollection: async (def: unknown) => {
          createdWith = def;
          return { _id: "SiteContentHistory", created: true };
        },
      },
    };
    const result = await ensureHistoryCollection(stub);
    expect(result).toMatchObject({ created: true });
    expect(createdWith).toMatchObject({
      _id: "SiteContentHistory",
      displayName: "Site Content History",
    });
  });
});
