# `<EditableImage>` — Component Spec

> Sub-bead 5 of **cfw-ajk** (Brenda inline-edit Path B); Linux mirror tracked as cfw-nis. Pairs with `<EditableText>` (cfw-v5w / cfw-ajk.2 spec) to give the site owner end-to-end inline editing without leaving the rendered page.
>
> Status: spec only. No code lands until this is approved + cfw-ajk sub-bead 4 (`/api/admin/image-upload` upload endpoint) is in flight.

---

## 1. What it is

A React Server-Component-friendly wrapper around an image whose source is owner-editable. In customer-mode it renders a plain `<Image>` (or `<img>`) at byte-for-byte parity with what we ship today — same SEO, same Lighthouse, same JS payload. In owner-mode it overlays a pencil + replace affordance, opens a file picker, uploads through `/api/admin/image-upload`, and swaps the `src` once Wix Media has the new asset.

Sibling of `<EditableText>` (cfw-v5w). Where EditableText edits `SiteContent` rows, EditableImage edits **Wix Media references** stored on the same `SiteContent` collection — the row's `value` is a Wix Media ID, and the component resolves it to a CDN URL at render time.

## 2. API

```tsx
<EditableImage
  contentKey="hero.image"
  fallbackSrc="/brand/hero-default.jpg"
  alt="Bear in the Blue Ridge mountains"
  // optional
  width={1920}
  height={800}
  priority={false}
  className="w-full h-auto"
  sizes="(max-width: 768px) 100vw, 1920px"
  acceptHint="image/jpeg, image/png, image/webp"
  maxBytes={5_000_000}
/>
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `contentKey` | `string` (required) | — | SiteContent dotted-path key whose `value` is a Wix Media ID (e.g. `wix:image://v1/abc123/hero.jpg`). Same shape as `<EditableText>`'s `contentKey`. |
| `fallbackSrc` | `string` (required) | — | Static URL rendered when SiteContent has no row, the row's value isn't a Wix Media ID, or the resolver can't reach Wix Media. Same fallback contract as `getSiteContent`. |
| `alt` | `string` (required) | — | a11y. Owner-mode does not allow editing `alt` — that ships through a separate dev-PR or via SiteContent text key. Forces every caller to think about alt-text upfront. |
| `width` | `number` | — | Used for layout reservation. Required when not `priority`. |
| `height` | `number` | — | Same. |
| `priority` | `boolean` | `false` | Forwarded to `next/image` for above-the-fold images. |
| `className` | `string` | `undefined` | Forwarded to the `<Image>` element. |
| `sizes` | `string` | `next/image` default | Forwarded for responsive srcset. |
| `acceptHint` | `string` | `"image/jpeg, image/png, image/webp"` | File-picker `accept` attribute (display only — server validates). |
| `maxBytes` | `number` | `5_000_000` (5 MB) | Client-side upper bound for fail-fast UX (display only — server enforces). |

The component does **not** accept a `src` prop. Source of truth = SiteContent. Edits propagate via the upload endpoint, which writes the new Wix Media ID back to the `SiteContent` row and triggers a tag-based revalidate.

## 3. Owner-mode detection

Same as `<EditableText>`: `getOwnerSession()` (cfw-v5w) — a request-scoped boolean derived from the `cf_owner_session` cookie (8h expiry, verified email match against `BRENDA_OWNER_EMAIL`). When false, the component returns just the `<Image>` and ships zero owner-edit JS.

## 4. Rendered output

### 4.1 Customer mode

```html
<img
  src="https://static.wixstatic.com/media/<resolved>"
  srcset="…"
  alt="Bear in the Blue Ridge mountains"
  width="1920"
  height="800"
  class="w-full h-auto"
/>
```

(or the `next/image` equivalent — same as a hand-rolled `<Image src={resolvedSrc}>`)

### 4.2 Owner mode

```html
<span data-editable-image="hero.image" class="cf-editable-image">
  <img … />
  <button
    type="button"
    class="cf-editable-image__replace"
    aria-label="Replace hero image"
    data-action="replace-site-image"
  >
    <span class="cf-editable-image__icon" aria-hidden="true"></span>
    Replace
  </button>
</span>
```

The wrapper sits on a `position: relative` container; the replace button positions absolutely top-right of the image. Visible on hover/focus only — never obscures the customer-facing image during normal viewing of an owner session (so Brenda can preview the page as a customer would by simply not hovering).

Click / Enter / Space on the button opens a file picker (no popover, no separate modal — native `<input type="file" hidden>`).

## 5. State machine

```
            ┌──────────┐
   mount ──>│   read   │<──────────────────────────────┐
            └────┬─────┘                                │
                 │ click Replace → file chosen          │
                 ▼                                      │
            ┌──────────┐                                │
            │ validate │  client size/type checks       │
            └────┬─────┘                                │
                 │ valid                                │
                 ▼                                      │
            ┌──────────┐  POST /api/admin/image-upload  │
            │ uploading│──────success──┐                │
            └────┬─────┘               │                │
                 │ network/server err  │                │
                 ▼                     ▼                │
            ┌──────────┐          ┌──────────┐         │
            │  error   │          │  saved   │─2s──────┘
            └────┬─────┘          └──────────┘
                 │ user picks another file or dismisses
                 ▼
              (back to read)
```

| State | Visual cue | Pointer events | Network |
|---|---|---|---|
| `read` | image only (Replace button on hover/focus) | image clickable through to file picker | none |
| `validate` | brief flash of validation toast (≤300 ms) | disabled | none |
| `uploading` | progress spinner over image; image dims to 60% opacity | disabled | POST in flight |
| `saved` | green checkmark pulses over image for 2s; image swapped | disabled briefly | none |
| `error` | red border + role="alert" message inline below image; "Try a different file" button focused | enabled (can re-pick) | none |

State transitions are explicit. Picking a new file in `error` returns to `validate`. There is no implicit retry of the previous upload on network blip — the user re-confirms by re-picking, which makes "what file am I uploading right now" unambiguous.

## 6. Upload flow (network contract)

```http
POST /api/admin/image-upload
Content-Type: multipart/form-data; boundary=...
Cookie: cf_owner_session=...

Form fields:
  file       — the binary
  key        — "hero.image"
  ifMatch    — Wix Media ID currently in SiteContent (concurrency)
```

Response:

```http
200 OK
{
  "ok": true,
  "wixMediaId": "wix:image://v1/abc123/new-hero.jpg",
  "resolvedUrl": "https://static.wixstatic.com/media/<…>",
  "updatedAt": "2026-05-09T18:42:11.402Z"
}

401 Unauthorized — owner session missing/expired
409 Conflict     — ifMatch is stale (someone else replaced it from another session)
413 Payload Too Large — file > 5 MB
415 Unsupported Media Type — file MIME type not in allowlist
422 Unprocessable — image dimensions outside policy (e.g. <100px wide), key not whitelisted
500 Internal Error — Wix Media or SiteContent mutation failed; retryable
```

The endpoint:
1. Streams the upload to Wix Media (via the admin-credentialed `@wix/media` import client).
2. On Wix Media success, updates the `SiteContent` row with the new Wix Media ID — same atomicity model as `<EditableText>` save.
3. Issues `revalidateTag('site-content')` (or per-key `revalidateTag(\`site-content:${key}\`)` if cfw-ajk.2 lands the granular variant).
4. Returns the resolved CDN URL so the component can display the new image without waiting for the next render's revalidate to flush.

## 7. Validation

Server is the source of truth. Route enforces:

- `key` matches the `SITE_CONTENT_SEED` allowlist baked from cf-atze (same allowlist as `<EditableText>`, but the route checks the row's expected `valueType === 'image'` flag — non-image keys reject with 422). New image keys ship via dev PR.
- `file.size <= 5_000_000` bytes (5 MB)
- `file.mimetype` ∈ `['image/jpeg', 'image/png', 'image/webp']`
- Decoded image dimensions: width ≥ 100 px, height ≥ 100 px, no animated GIF
- EXIF stripping on upload (privacy + payload reduction)
- Rate limit: 30 uploads/minute per session

Client mirrors size + MIME for fail-fast UX but never enforces — server has final say.

## 8. Resolving Wix Media IDs

Wix Media IDs look like `wix:image://v1/<hash>/<filename>#originWidth=1920&originHeight=800`. The component resolves them to CDN URLs server-side using the existing `@wix/sdk` `media.getDownloadUrl` (or equivalent) so the rendered HTML carries a stable `https://static.wixstatic.com/media/<…>` URL — no client-side hydration round-trip, no FOUC.

If the resolver throws (Wix Media unreachable, ID malformed) the component falls back to `fallbackSrc`. Brenda's broken upload still leaves the page renderable.

## 9. Accessibility

- Replace button: `aria-label="Replace ${alt}"` so screen-reader users hear "Replace [alt-text] button" with concrete context.
- File picker is the native input — accessible by default.
- During `uploading`, image carries `aria-busy="true"` and a co-located `aria-live="polite"` region announces "Uploading new image", "Image uploaded", or "Upload failed: <reason>". Errors use `role="alert"` for assertive announcement.
- Replace button has a visible focus ring; tab order = (preceding content) → image → Replace button → (following content). Image itself remains a tab-reachable target if it has a wrapping link.
- Color contrast on the Replace pill (≥3:1 against the image) — enforced by an `outline + drop-shadow` ring rather than relying on background contrast alone.
- Keyboard tab into Replace + Enter triggers file picker; Escape during file-picker dialog cancels (browser-native).

## 10. Keyboard shortcuts

| Key | Read | Validate | Uploading | Error |
|---|---|---|---|---|
| Tab | move focus | n/a | move focus (Replace re-disabled) | move focus |
| Enter / Space on Replace | open file picker | n/a | n/a | open file picker (re-pick) |
| Escape | n/a | dismiss validation toast | n/a | clear error, return to read |

There is no keyboard shortcut for "save" or "cancel" mid-upload — the upload is committed once the file is picked, so the user has nothing to confirm. This matches OS-level "drag a file into a save dialog" mental models.

## 11. SSR / RSC composition

```tsx
// src/components/admin/EditableImage.tsx (server)
import Image from "next/image";
import { getSiteContent } from "@/lib/cms/site-content";
import { getOwnerSession } from "@/lib/auth/owner";
import { resolveWixMediaUrl } from "@/lib/wix/media";
import { EditableImageReplacer } from "./EditableImageReplacer"; // client

export async function EditableImage({
  contentKey,
  fallbackSrc,
  alt,
  width,
  height,
  priority,
  className,
  sizes,
  acceptHint,
  maxBytes,
}: EditableImageProps) {
  const [wixMediaIdOrEmpty, owner] = await Promise.all([
    getSiteContent(contentKey, ""),
    getOwnerSession(),
  ]);

  const resolvedSrc =
    (await resolveWixMediaUrl(wixMediaIdOrEmpty)) || fallbackSrc;

  const img = (
    <Image
      src={resolvedSrc}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      sizes={sizes}
      className={className}
    />
  );

  if (!owner) return img;

  return (
    <span data-editable-image={contentKey} className="cf-editable-image">
      {img}
      <EditableImageReplacer
        contentKey={contentKey}
        currentWixMediaId={wixMediaIdOrEmpty}
        alt={alt}
        acceptHint={acceptHint}
        maxBytes={maxBytes}
      />
    </span>
  );
}
```

The server entry resolves the SiteContent row + checks owner-session in parallel, falls back to `fallbackSrc` if Wix Media is unreachable, and only renders the client `EditableImageReplacer` for owners. Customer renders ship zero replace-flow JS.

## 12. Error messages (copy)

| Failure | Surfaced text |
|---|---|
| client size > maxBytes | "That file is too big — keep it under 5 MB. Try resizing it first." |
| client MIME mismatch | "We only accept JPG, PNG, or WebP. Try saving the file in one of those formats." |
| 401 | "Your editing session expired. Please refresh the page and sign in again." |
| 409 | "Someone else replaced this image just now. Refresh to see their version." |
| 413 (server-side size) | "That file is too big — keep it under 5 MB." |
| 415 | "We can't open that file format. Try JPG, PNG, or WebP." |
| 422 (dimensions) | "That image is too small — it needs to be at least 100 pixels wide." |
| 422 (key) | "This image isn't editable from the page yet — ask Chris." |
| 500 / network | "Couldn't upload. Try again, or refresh the page if it keeps failing." |

7th-grade reading level, no tech-blame, actionable next-step in every case.

## 13. Performance considerations

- The customer-mode markup is identical to today's hand-rolled `<Image>`. Lighthouse / LCP unchanged.
- Owner-mode adds ~3-4 KB of JS (the replacer client component) deferred behind the dynamic-import gate — never loaded in customer sessions.
- Wix Media CDN URLs are stable hashes; Next's image cache de-dupes across requests automatically.
- The `resolveWixMediaUrl` call adds at most one Wix API round-trip per page render. Cache via `react.cache` so a page rendering N images of the same row pays one round-trip (mirrors `getSiteContent`'s shape).

## 14. Out of scope

- Editing `alt` text from the UI — alt is a content-strategy concern that warrants a real review path; ships via dev PR or via a separate `image.<key>.alt` SiteContent row that `<EditableText>` handles.
- Image cropping / focal-point editing — Brenda picks "the photo we use" not "this region of the photo." If we need crop, that's a Wix Media editor feature, not ours.
- Multi-image gallery editing (e.g. PDP image array) — separate component, separate spec.
- Drag-and-drop replacement — keyboard + click is the table stakes; DnD is a v2 nice-to-have.
- Optimization (auto-WebP conversion, server-side resize). Wix Media handles these on its CDN; we don't double-process.

## 15. Test plan (deferred to implementation PR)

Coverage target: 90%+ on the client subtree, 100% on the server entry's branch matrix (owner / not owner / wix-media-resolves / wix-media-falls-back).

Cases:
1. Customer mode renders a single `<Image>` with no `data-editable-image` attribute and no replacer subtree.
2. Owner mode renders the Replace button.
3. Replace button click triggers the file-picker `<input>` (sample via `fireEvent.click` on the button + assert the input's `click` was called).
4. Picking a file > 5 MB shows the validation message and does not POST.
5. Picking a non-image MIME type shows the validation message and does not POST.
6. Picking a valid file POSTs `multipart/form-data` to `/api/admin/image-upload` with the correct `key` and `ifMatch`.
7. 200 response transitions through `saved` for ~2s and swaps the `src` to `resolvedUrl`.
8. 401 transitions to `error` with re-auth copy and `role="alert"`.
9. 409 transitions to `error` and the image is **not** swapped.
10. 413/415/422 each surface their copy and re-enable the Replace button.
11. Network failure transitions to `error` with retry button focused.
12. `priority={true}` forwards through to `<Image>`.
13. SiteContent row missing → `fallbackSrc` rendered, owner-mode still shows Replace (so Brenda can supply the first image).
14. Wix Media resolver throws → `fallbackSrc` rendered, owner-mode still shows Replace.
15. Replace button has visible focus ring and `aria-label` includes `alt`.

## 16. Open questions for review

- **Direct-to-Wix-Media uploads** — current spec proxies through cfw's `/api/admin/image-upload`. Wix Media supports browser-direct uploads with a signed URL. Direct uploads would offload bandwidth from Vercel (which we're conserving per the May 9 directive). Tradeoff: signed-URL flow needs an extra "request signed URL" round-trip and shifts more crypto into the client bundle. Worth a measure once we know upload frequency.
- **Image preview before upload** — should the file picker show the chosen file as a thumbnail before committing? Adds 1-2 KB of preview JS but cuts mistake-revisits.
- **Old asset cleanup** — replacing an image leaves the old Wix Media asset in storage. Wix Media doesn't auto-prune. Cleanup might warrant a separate cron + sweep (out of scope here, file as cf-?? if the storage cost matters).
- **Audit log** — same question as `<EditableText>`. A `SiteContentEditLog` collection that logs both text and image changes would consolidate the audit trail.

---

## Refs

- Builds on:
  - PR #472 (cf-4mol — `getSiteContent` reader; same fallback contract)
  - PR #1177 (cf-atze — `SITE_CONTENT_SEED` allowlist source)
  - cfw-v5w (shipped) — `<EditableText>` impl, sibling shape pattern
- Sibling sub-bead: cfw-ajk.4 — `/api/admin/image-upload` endpoint (in flight)
- Linux mirror: cfw-nis (parallel implementation tracking)
- Parent epic: cfw-66o (owner-friendly admin UI)
