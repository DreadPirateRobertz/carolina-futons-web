import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";

import { getOwnerSession } from "@/lib/auth/owner";
import { upsertCollectionItemByKey } from "@/lib/wix/data";
import { logWixFailure } from "@/lib/wix/errors";
import {
  AUTH_INPUT_ERROR_MESSAGES,
  classifyAuthInputError,
} from "@/lib/auth/sdk-error";
import { SITE_CONTENT_CACHE_TAG } from "@/lib/cms/site-content";
import { validateOwnerEditKey } from "@/lib/cms/owner-edit-validation";

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
// Out of scope:
//   - undo/version history (sub-bead 9 — cfw-6qd.9)
//   - XSS sanitisation beyond length limits (sub-bead 10 — cfw-6qd.10)
//   - audit log (sub-bead 8 — cfw-6qd.8)
//   - image-upload (sub-bead 6 — cfw-6qd.6)

const COLLECTION_ID = "SiteContent";

// SiteContent values are short labels and tagline copy. 4 KiB is generous
// for any owner-edited string while still bounding payload size.
const MAX_VALUE_LENGTH = 4096;

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
  const rawValue = typeof body.value === "string" ? body.value : "";

  // cfw-6qd.12: key validation runs through the shared validator so the
  // endpoint, the seed test (cfw-roi/cf-atze), and any future caller agree
  // on what a valid SiteContent key looks like (lowercase dotted-path with
  // ≥ 2 hyphenated segments). Catches camelCase / typo'd / single-segment
  // keys that would otherwise land orphan rows the readers can't see.
  const keyCheck = validateOwnerEditKey(body.key);
  if (!keyCheck.ok) return badRequest(keyCheck.message);
  const key = keyCheck.key;

  if (typeof body.value !== "string") {
    return badRequest("Missing required field: value (must be a string).");
  }
  if (rawValue.length > MAX_VALUE_LENGTH) {
    return badRequest(`Field 'value' exceeds ${MAX_VALUE_LENGTH} chars.`);
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
      fields: { value: rawValue },
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

  // Bust the unstable_cache snapshot so getSiteContent() sees the new value
  // on the next read. The reader's per-request React.cache layer is
  // session-scoped and rebuilds on the next request, so we only need the
  // tag-level invalidation.
  revalidateTag(SITE_CONTENT_CACHE_TAG, "default");

  return NextResponse.json({ ok: true, key, value: rawValue });
}
