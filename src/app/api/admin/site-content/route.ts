import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";

import { getOwnerSession } from "@/lib/auth/owner";
import {
  lookupCollectionItemByKey,
  upsertCollectionItemByKey,
} from "@/lib/wix/data";
import { logWixFailure } from "@/lib/wix/errors";
import {
  AUTH_INPUT_ERROR_MESSAGES,
  classifyAuthInputError,
} from "@/lib/auth/sdk-error";
import { SITE_CONTENT_CACHE_TAG } from "@/lib/cms/site-content";
import {
  sanitizeOwnerEditValue,
  validateOwnerEditKey,
} from "@/lib/cms/owner-edit-validation";
import { sanitizeOwnerHtml } from "@/lib/cms/owner-edit-sanitize";
import { recordOwnerEdit } from "@/lib/admin/audit-log";

export const dynamic = "force-dynamic";

// cfw-6qd.3: persistence endpoint for the EditableText (cfw-6qd.2) inline-edit
// flow. Owner-only — re-uses getOwnerSession() from the cfw-wef gate to
// authenticate, but returns 401/403 JSON instead of redirecting (consumers
// are fetch() callers, not browser navigations).
//
// Body shape: { key: string, value: string }. The key is the dotted-path
// SiteContent identifier (e.g. "footer.tagline") and the value is the new
// string. We upsert via Wix Data items.save() keyed by `key`, then
// revalidateTag("site-content") so getSiteContent() sees the new value on
// the next read instead of waiting out the 5-minute revalidate window
// (cfw-vxb cache).
//
// cfw-6qd.11: every successful save also appends an audit row to the
// OwnerAuditLog collection ({ actorEmail, action: "edit", target: key,
// before, after, ts }). Audit write is best-effort — a Wix outage during
// audit doesn't fail the user-visible save.
//
// Out of scope:
//   - undo/version history (sub-bead 9 — cfw-6qd.9)
//   - audit log (sub-bead 8 — cfw-6qd.8)
//   - XSS sanitisation beyond length limits (sub-bead 10 — cfw-6qd.10)
//   - image-upload (sub-bead 6 — cfw-6qd.6)

const COLLECTION_ID = "SiteContent";

type SiteContentBody = { key?: unknown; value?: unknown };

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(req: NextRequest) {
  // Auth gate: owner-only.
  const owner = await getOwnerSession();
  if (!owner) {
    return NextResponse.json(
      { error: "Owner sign-in required." },
      { status: 401 },
    );
  }

  // Body parse + validation.
  const body = (await req.json().catch(() => ({}))) as SiteContentBody;

  // cfw-6qd.12: key validation runs through the shared validator so the
  // endpoint, the seed test (cfw-roi/cf-atze), and any future caller agree
  // on what a valid SiteContent key looks like (lowercase dotted-path with
  // ≥ 2 hyphenated segments). Catches camelCase / typo'd / single-segment
  // keys that would otherwise land orphan rows the readers can't see.
  const keyCheck = validateOwnerEditKey(body.key);
  if (!keyCheck.ok) return badRequest(keyCheck.message);
  const key = keyCheck.key;

  // Sanitization stack: cheap structural pass first, then DOMPurify.
  //
  //   1. cfw-6qd.12 — sanitizeOwnerEditValue: strips ASCII control bytes
  //      (\x00–\x1F except whitespace, \x7F), enforces the 4 KiB cap,
  //      rejects values starting with `javascript:` / `vbscript:` /
  //      `data:` URL schemes (the href-shaped keys like
  //      `announcement.rotation.3.cta-href` end up in `<a href={value}>`
  //      where React doesn't pre-block these schemes before render-time).
  //      Empty strings are allowed — clearing a key is a valid edit.
  //   2. cfw-qyy — sanitizeOwnerHtml: DOMPurify allowlist
  //      (b/i/strong/em/a/ul/li/p/br + http/mailto/tel/relative hrefs).
  //      Strips <script>/<iframe>/event handlers AND their content
  //      (FORBID_CONTENTS) so a payload like
  //      "Hello <script>alert(1)</script>world" persists as "Hello world".
  //
  // Order matters: the structural pass rejects malformed/dangerous-prefix
  // input at the boundary so DOMPurify never wastes cycles on a payload
  // that would have been rejected anyway.
  const valueCheck = sanitizeOwnerEditValue(body.value);
  if (!valueCheck.ok) return badRequest(valueCheck.message);
  const value = sanitizeOwnerHtml(valueCheck.value);

  // cfw-6qd.11: snapshot the previous value BEFORE the upsert so the audit
  // entry can record the diff. A failed lookup here doesn't fail the save —
  // we just record `before: ""` and trust the upsert path's error handler.
  let beforeValue = "";
  try {
    const existing = await lookupCollectionItemByKey<{ value?: unknown }>({
      collectionId: COLLECTION_ID,
      keyField: "key",
      keyValue: key,
      tokens: owner.tokens,
    });
    if (existing && typeof existing.value === "string") {
      beforeValue = existing.value;
    }
  } catch (err) {
    // Don't surface — the upsert below will produce a definitive error if
    // Wix is genuinely down. For now we just lose the audit's `before` snapshot.
    await logWixFailure("admin/site-content", "items.query (before)", err);
  }

  // Wix Data write under the owner's member tokens. Permissions live on the
  // collection — Wix returns 4xx if the member isn't writer-permitted there
  // (we surface that as the same 422 path the auth routes use, so the diag
  // pattern from cfw-hb3 still works).
  try {
    await upsertCollectionItemByKey({
      collectionId: COLLECTION_ID,
      keyField: "key",
      keyValue: key,
      fields: { value },
      tokens: owner.tokens,
    });
  } catch (err) {
    const kind = classifyAuthInputError(err);
    if (kind) {
      return NextResponse.json(
        { error: AUTH_INPUT_ERROR_MESSAGES[kind] },
        { status: 422 },
      );
    }
    await logWixFailure("admin/site-content", "items.save", err);
    return NextResponse.json(
      { error: "Save failed. Please try again." },
      { status: 502 },
    );
  }

  // cfw-6qd.11: best-effort audit append. recordOwnerEdit never throws —
  // failures are logged + returned as ok=false so the save still succeeds.
  // The audit's `after` is the SANITISED value (what was actually persisted),
  // not the raw input — `before` is the previously-persisted (already-
  // sanitised on its own write) value, so the diff stays apples-to-apples.
  await recordOwnerEdit(
    {
      actorEmail: owner.email,
      action: "edit",
      target: key,
      before: beforeValue,
      after: value,
    },
    owner.tokens,
  );

  // Bust the unstable_cache snapshot so getSiteContent() sees the new value
  // on the next read. The reader's per-request React.cache layer is
  // session-scoped and rebuilds on the next request, so we only need the
  // tag-level invalidation.
  revalidateTag(SITE_CONTENT_CACHE_TAG, "default");

  return NextResponse.json({ ok: true, key, value });
}
