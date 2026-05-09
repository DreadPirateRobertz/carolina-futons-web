import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";

import { getOwnerSession } from "@/lib/auth/owner";
import {
  lookupCollectionItemByKey,
  upsertCollectionItemByKey,
} from "@/lib/wix/data";
import { logWixFailure } from "@/lib/wix/errors";
import { SITE_CONTENT_CACHE_TAG } from "@/lib/cms/site-content";
import { validateOwnerEditKey } from "@/lib/cms/owner-edit-validation";
import { recordOwnerEdit } from "@/lib/admin/audit-log";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

// cfw-6qd.8: image-upload endpoint for the EditableImage owner-mode flow.
//
// POST /api/admin/image-upload (multipart/form-data):
//   - file:    File — image/jpeg | image/png | image/webp, ≤ 5 MiB
//   - key:     string — SiteContent dotted-path the URL will be written into
//              (e.g. "hero.headline-image")
//   - ifMatch: string (optional) — current SiteContent value the editor saw,
//              for last-writer-wins audit context
//
// On success, the file is uploaded to Wix Media Manager via the Wix Site
// Media v3 REST API (no @wix/media SDK is installed; obsidian's plan
// confirmed REST is the supported path), the resolved CDN URL is upserted
// into the SiteContent row keyed by `key`, an audit row is appended, and
// the site-content cache tag is busted so the next render serves the new
// image. Returns { ok: true, wixMediaId, resolvedUrl, updatedAt }.
//
// Auth at the gateway: getOwnerSession() — only allow-listed owner emails
// reach the upload code path.
//
// Auth at the upstream call: WIX_BACKEND_KEY (the site-scoped Wix API key,
// already declared as a required env in src/lib/env.ts). API key auth has
// account-level scope on Wix Site Media writes, which member-OAuth tokens
// don't reliably grant for headless storefronts. See PR description for
// the deploy gate — the env value must be populated in Vercel before this
// route works in prod (Stilgar adding).
//
// Out of scope (deferred per cfw-6qd.8 plan):
//   - dimension decode (would need image-size or sharp dep — owner approval)
//   - EXIF stripping
//   - rate limiting (Vercel platform + Wix upstream limits suffice for MVP)
//   - ifMatch concurrency check (last-writer-wins for now — Brenda is the
//     only writer)

const COLLECTION_ID = "SiteContent";
const KEY_FIELD = "key";

// 5 MiB matches the obsidian plan; balances Brenda's typical hero photos
// (1-2 MiB after Wix re-encoding) against Vercel's 4.5 MiB request body
// limit on Hobby/Pro tiers (see vercel.com/docs/limits/overview). Most
// owner uploads land well under this; oversized uploads return 413 so
// the editor can prompt for a re-encode.
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const WIX_GENERATE_UPLOAD_URL =
  "https://www.wixapis.com/site-media/v1/files/generate-upload-url";

type WixUploadUrlResponse = { uploadUrl?: string };
type WixFileDescriptor = {
  id?: string;
  url?: string;
  // Wix sometimes wraps the descriptor as { file: { ... } } and sometimes
  // returns it flat — be defensive.
};
type WixUploadResponse = { file?: WixFileDescriptor } & WixFileDescriptor;

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

type FileLike = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function isFileLike(value: unknown): value is FileLike {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === "string" &&
    typeof v.type === "string" &&
    typeof v.size === "number" &&
    typeof v.arrayBuffer === "function"
  );
}

export async function POST(req: NextRequest) {
  // 1. Auth gate
  const owner = await getOwnerSession();
  if (!owner) {
    return NextResponse.json(
      { error: "Owner sign-in required." },
      { status: 401 },
    );
  }

  // 2. Multipart parse
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return badRequest("Expected multipart/form-data body.");
  }

  // formData.get("file") returns a File in Node ≥18 (undici) / browsers, but
  // some test environments hand back a File-like object that fails
  // `instanceof File` even though it carries name/type/size/arrayBuffer.
  // Duck-type to the properties we actually use rather than gate on the
  // class identity.
  const fileEntry = formData.get("file");
  if (!isFileLike(fileEntry)) {
    return badRequest("Missing required field: file.");
  }
  const file = fileEntry;

  // 3. MIME + size guards (415 / 413)
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: `Unsupported MIME type: ${file.type || "(unknown)"}. Allowed: ${[...ALLOWED_MIME_TYPES].join(", ")}.`,
      },
      { status: 415 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    const maxMiB = Math.round(MAX_FILE_SIZE / (1024 * 1024));
    return NextResponse.json(
      { error: `File exceeds ${maxMiB} MiB.` },
      { status: 413 },
    );
  }

  // 4. Key validation (shared with /api/admin/site-content)
  const keyValidation = validateOwnerEditKey(formData.get("key"));
  if (!keyValidation.ok) {
    return badRequest(keyValidation.message);
  }
  const key = keyValidation.key;

  const ifMatchRaw = formData.get("ifMatch");
  const ifMatch =
    typeof ifMatchRaw === "string" && ifMatchRaw.length > 0 ? ifMatchRaw : "";

  let apiKey: string;
  try {
    apiKey = env("WIX_BACKEND_KEY");
  } catch (err) {
    // Required env not populated — fail loudly (the env() helper throws
    // with a clear "Missing required env var" message). Translate to a
    // 503 so the editor surfaces "service unavailable" rather than the
    // generic 5xx.
    console.error("[admin/image-upload] WIX_BACKEND_KEY not set:", err);
    return NextResponse.json(
      { error: "Image upload not configured for this environment." },
      { status: 503 },
    );
  }

  const fileName = file.name && file.name.length > 0 ? file.name : "owner-upload";

  // 5. Step 1 of upload: ask Wix for a signed upload URL.
  // Wix REST API key auth uses bare `Authorization: <key>` (no "Bearer"
  // prefix) — that prefix is reserved for OAuth tokens.
  let uploadUrl: string;
  try {
    const generateRes = await fetch(WIX_GENERATE_UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mimeType: file.type,
        fileName,
        // Default folder ("Owner uploads") could go here once provisioned;
        // omitting parentFolderId puts the file in the site root, which is
        // fine for MVP.
      }),
    });
    if (!generateRes.ok) {
      const text = await generateRes.text().catch(() => "");
      throw new Error(
        `generate-upload-url ${generateRes.status}: ${text.slice(0, 200)}`,
      );
    }
    const json = (await generateRes.json()) as WixUploadUrlResponse;
    if (typeof json.uploadUrl !== "string" || json.uploadUrl.length === 0) {
      throw new Error("generate-upload-url response missing uploadUrl");
    }
    uploadUrl = json.uploadUrl;
  } catch (err) {
    await logWixFailure(
      "admin/image-upload",
      "generate-upload-url",
      err,
    );
    return NextResponse.json(
      { error: "Upload setup failed. Please try again." },
      { status: 502 },
    );
  }

  // 6. Step 2 of upload: PUT the file bytes to the signed URL
  let descriptor: WixFileDescriptor;
  try {
    const buffer = await file.arrayBuffer();
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: buffer,
    });
    if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => "");
      throw new Error(
        `upload PUT ${uploadRes.status}: ${text.slice(0, 200)}`,
      );
    }
    const json = (await uploadRes.json()) as WixUploadResponse;
    descriptor = json.file ?? json;
    if (typeof descriptor.url !== "string" || descriptor.url.length === 0) {
      throw new Error("upload response missing file.url");
    }
  } catch (err) {
    await logWixFailure("admin/image-upload", "upload PUT", err);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 502 },
    );
  }

  const resolvedUrl = descriptor.url as string;
  const wixMediaId = descriptor.id ?? "";

  // 7. Look up the previous SiteContent value (for audit "before") and
  // upsert the new URL into the row.
  let beforeValue = "";
  try {
    const previous = await lookupCollectionItemByKey<{ value?: unknown }>({
      collectionId: COLLECTION_ID,
      keyField: KEY_FIELD,
      keyValue: key,
      tokens: owner.tokens,
    });
    if (previous && typeof previous.value === "string") {
      beforeValue = previous.value;
    }
  } catch (err) {
    // Look-up failure is non-fatal — if Wix is flaky, prefer the upload+
    // upsert path to succeed and audit ifMatch instead of a wrong before.
    console.error(
      "[admin/image-upload] lookupCollectionItemByKey failed (non-fatal):",
      err,
    );
    beforeValue = ifMatch;
  }

  try {
    await upsertCollectionItemByKey({
      collectionId: COLLECTION_ID,
      keyField: KEY_FIELD,
      keyValue: key,
      fields: { value: resolvedUrl },
      tokens: owner.tokens,
    });
  } catch (err) {
    await logWixFailure(
      "admin/image-upload",
      "upsertCollectionItemByKey",
      err,
    );
    return NextResponse.json(
      { error: "Save failed after upload. Please try again." },
      { status: 502 },
    );
  }

  // 8. Best-effort audit append. recordOwnerEdit never throws.
  await recordOwnerEdit(
    {
      actorEmail: owner.email,
      action: "upload",
      target: key,
      before: beforeValue,
      after: resolvedUrl,
    },
    owner.tokens,
  );

  // 9. Bust the site-content cache so getSiteContent() sees the new URL
  // on the next render (otherwise the 5-min unstable_cache window applies).
  revalidateTag(SITE_CONTENT_CACHE_TAG, "default");

  return NextResponse.json({
    ok: true,
    wixMediaId,
    resolvedUrl,
    updatedAt: new Date().toISOString(),
  });
}
