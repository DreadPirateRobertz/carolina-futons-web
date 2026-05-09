# `<EditableText>` — Component Spec

> Sub-bead 2 of **cfw-ajk** (Brenda inline-edit Path B). Foundation for letting the site owner edit copy directly on the rendered page in owner-mode, instead of through the Wix CMS dashboard.
>
> Status: spec only. No code lands until this is approved + cfw-ajk sub-bead 1 (`/api/admin/site-content` mutation endpoint) is in flight.

---

## 1. What it is

A React Server-Component-friendly wrapper that renders a SiteContent string and, in owner-mode only, lets the owner edit it inline. In customer-facing renders the wrapper is invisible — same DOM as a plain `<span>`, no JS shipped beyond what already loads.

The component is **the only sanctioned way** for non-Server-Component surfaces to read SiteContent rows once cfw-ajk lands. This keeps the read API (`getSiteContent`, cf-4mol/PR #472) on the server and wraps it for use everywhere.

## 2. API

```tsx
<EditableText
  siteContentKey="hero.headline"
  fallback="Find your perfect futon"
  // optional
  as="h1"
  className="font-heading text-4xl"
  multiline={false}
  ariaLabel="Hero headline"
/>
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `siteContentKey` | `string` (required) | — | Dotted-path key in the SiteContent collection (e.g. `footer.tagline`). |
| `fallback` | `string` (required) | — | Rendered when SiteContent is missing the key, Wix is unreachable, or the row's value isn't a string. Same contract as `getSiteContent(key, fallback)`. |
| `as` | keyof JSX.IntrinsicElements | `"span"` | Tag the rendered string sits inside. `"h1"` / `"p"` / `"div"` are common. Owner-mode preserves the same tag during edit so layout doesn't shift. |
| `className` | `string` | `undefined` | Forwarded to the rendered element. The pencil overlay positions absolutely against this element's bounding box. |
| `multiline` | `boolean` | `false` | Switches the inline editor between `<input>` and `<textarea>`. Multiline auto-grows up to 10 visible rows. |
| `ariaLabel` | `string` | inferred from `siteContentKey` | Used on the edit affordance (`<button>`) and the inline editor when no visible label is present. |

The component does **not** accept a `value` prop. The source of truth is always SiteContent — the component reads, edits propagate via the mutation endpoint, and a successful save triggers a tag-based revalidate so the next read returns the new value. There is no local-component state of truth.

## 3. Owner-mode detection

Owner-mode is a request-scoped boolean derived from session, not a build-time flag. The component's server entry calls `isOwnerSession()` which checks:

1. Cookie `cf_owner_session` set by `/api/admin/login` (Brenda's pin/email auth)
2. Session expiry under 8 hours
3. `BRENDA_OWNER_EMAIL` matches the cookie's verified email

If any check fails the component renders only the static string — no client JS, no pencil. This means a customer-facing render of the home page never hydrates owner-mode interaction code, keeping the bundle size impact at zero for ~99% of traffic.

## 4. Rendered output

### 4.1 Customer mode (default)

```html
<span class="font-heading text-4xl">Find your perfect futon</span>
```

That's it. No wrapping `<div>`, no `data-` attributes, no JS payload.

### 4.2 Owner mode

```html
<span data-editable-text="hero.headline" class="cf-editable">
  <span class="font-heading text-4xl">Find your perfect futon</span>
  <button
    type="button"
    class="cf-editable__pencil"
    aria-label="Edit hero headline"
    data-action="edit-site-content"
  ></button>
</span>
```

The `cf-editable` wrapper enables a pseudo-element hover hint and positions the pencil affordance. Pencil is hidden until hover/focus on either the wrapper or any element inside (so keyboard users can tab to the affordance from the surrounding content).

Click / Enter / Space on the pencil transitions to edit state.

## 5. State machine

```
            ┌──────────┐
   mount ──>│   read   │<──────────────────────────────┐
            └────┬─────┘                                │
                 │ owner clicks pencil                  │
                 ▼                                      │
            ┌──────────┐  Esc / blur unchanged          │
            │   edit   │────────────────────────────────┤
            └────┬─────┘                                │
                 │ Cmd+Enter or Save                    │
                 ▼                                      │
            ┌──────────┐  POST /api/admin/site-content  │
            │  saving  │──────success──┐                │
            └────┬─────┘               │                │
                 │ network/server err  │                │
                 ▼                     ▼                │
            ┌──────────┐          ┌──────────┐         │
            │  error   │          │  saved   │─2s──────┘
            └────┬─────┘          └──────────┘
                 │ user retries or Esc
                 ▼
              (back to read or edit)
```

| State | Visual cue | Editor state | Network |
|---|---|---|---|
| `read` | rendered string only (pencil on hover) | n/a | none |
| `edit` | inline editor focused, save/cancel buttons visible | `<input>` or `<textarea>` with current value | none |
| `saving` | editor disabled with spinner; save button shows "Saving…" | disabled | POST in flight |
| `saved` | green check pulses for 2s, then `read` | rendered string updated | none |
| `error` | red border + role="alert" message; retry button | enabled, value preserved | none |

State transitions are explicit — no implicit revert on `error`. The user must either retry, edit again, or press Esc to abandon (which restores the prior server value, not a stale optimistic value).

## 6. Save flow (network contract)

```http
POST /api/admin/site-content
Content-Type: application/json
Cookie: cf_owner_session=...

{
  "key": "hero.headline",
  "value": "Find your perfect futon today",
  "ifMatchUpdatedAt": "2026-05-09T08:00:00.000Z"
}
```

Response:

```http
200 OK
{
  "ok": true,
  "value": "Find your perfect futon today",
  "updatedAt": "2026-05-09T10:23:11.402Z"
}

409 Conflict        — server's updatedAt is newer than ifMatchUpdatedAt (someone else edited)
401 Unauthorized    — owner session missing/expired
422 Unprocessable   — validation failed (key not whitelisted, value too long)
500 Internal Error  — Wix mutation failed; retryable
```

Optimistic concurrency via `ifMatchUpdatedAt` prevents Brenda's tab from silently overwriting an edit she made on another device. On 409 the editor surfaces "Someone else just edited this — refresh to see the latest" and stays in `error` state.

After a 200, the endpoint MUST issue `revalidateTag('site-content')` so the next render of any `EditableText` reads the fresh value. The component itself does not optimistically update — it re-fetches via the React cache primed by the revalidate.

## 7. Accessibility

- The pencil button has a visible-on-focus outline; keyboard tab order = (preceding content) → string → pencil button → (following content). Focus does **not** trap on the pencil in `read` state.
- Entering `edit` moves focus to the inline editor field. Save and Cancel buttons follow in tab order.
- Exiting `edit` (save success, save error retry, Esc cancel) returns focus to the pencil button so a keyboard-only user picks up where they left off.
- Status announcements via `aria-live="polite"` on a co-located region: "Saving", "Saved", "Save failed: <message>". Only `error` uses `aria-live="assertive"` plus `role="alert"`.
- The editor element carries `aria-label={ariaLabel ?? \`Edit ${siteContentKey}\`}` and a `aria-describedby` pointing to a help-text node for the keyboard shortcuts.
- `multiline` editor's auto-grow respects user font-size zoom — height is em-based, not px.
- WCAG 2.1 AA contrast on pencil hover (≥3:1 against background) and saved/error states (≥4.5:1 for text).

## 8. Keyboard shortcuts

| Key | Read | Edit | Saving | Error |
|---|---|---|---|---|
| Tab | move focus | move focus within editor | move focus within editor | move focus within editor |
| Enter on pencil | → `edit` | (insert newline if `multiline` else save) | n/a | (re-enter `edit`) |
| Cmd / Ctrl + Enter | n/a | → `saving` | n/a | retry → `saving` |
| Escape | n/a | → `read` (discard) | n/a | → `read` (discard) |
| Cmd / Ctrl + Z | n/a | native undo within editor | n/a | native undo within editor |

Cmd is mapped on macOS; Ctrl on Windows / Linux. The component reads `navigator.userAgentData?.platform` once on mount and adjusts the help-text accordingly.

## 9. SSR / RSC composition

`<EditableText>` itself is a Server Component — it calls `await getSiteContent(key, fallback)` directly and returns either the static string (customer mode) or a thin Client Component subtree (owner mode). The client subtree is dynamic-imported so customer-mode renders ship zero owner-edit JS.

```tsx
// src/components/owner/EditableText.tsx (server)
import { getSiteContent } from "@/lib/cms/site-content";
import { isOwnerSession } from "@/lib/owner/session";
import dynamic from "next/dynamic";

const OwnerEditableText = dynamic(() => import("./EditableTextClient"), {
  ssr: true,
});

export async function EditableText({
  siteContentKey,
  fallback,
  as = "span",
  ...rest
}: EditableTextProps) {
  const value = await getSiteContent(siteContentKey, fallback);
  if (!(await isOwnerSession())) {
    const Tag = as as keyof JSX.IntrinsicElements;
    return <Tag {...rest}>{value}</Tag>;
  }
  return (
    <OwnerEditableText
      siteContentKey={siteContentKey}
      initialValue={value}
      as={as}
      {...rest}
    />
  );
}
```

## 10. Validation

Server-side (`/api/admin/site-content` route) is the source of truth. The route enforces:

- `key` matches the SiteContent allowlist baked from `SITE_CONTENT_SEED` (cf-atze) — Brenda cannot create new keys via this endpoint, only edit known ones. New keys ship via dev PR.
- `value` is a string ≤ 10,000 chars.
- `value` does not contain HTML tag chars (`<`, `>`, `&`) unless the key is in a small `RICH_HTML_KEYS` list (none today). This guards XSS on render, since cfw renders SiteContent values as plain React text — no raw-HTML injection.
- Rate limit: 60 saves/minute per session.

Client-side mirrors validations as user feedback (length, forbidden chars) but never enforces — server has final say.

## 11. Error messages (copy)

| Failure | Surfaced text |
|---|---|
| 401 | "Your editing session expired. Please refresh the page and sign in again." |
| 409 | "Someone else just edited this. Refresh to see their change." |
| 422 (key) | "This text isn't editable from the page yet — ask Chris." |
| 422 (length) | "Too long — keep it under 10,000 characters." |
| 422 (HTML) | "Plain text only on this field. Try removing `<` or `>` characters." |
| 500 / network | "Couldn't save. Try again, or refresh the page if it keeps failing." |

Copy reads at a 7th-grade level. No jargon. Avoids tech-blame ("our server" / "the API" / "Wix") since Brenda doesn't conceptualize those.

## 12. Out of scope

- Adding new SiteContent keys via the UI — dev-PR-only for now.
- Rich-text editing (bold/italic/lists). The Path B target is one-off copy strings; FAQ articles and blog posts stay in Wix CMS dashboard where rich text already works.
- Image / asset replacement. Hero images, footer logos etc. stay on the BUSINESS constant or Wix Stores; image editing has separate workflows.
- Translation / i18n. Single-locale today; if cf-3qt expands to multi-locale, the contract gains a `locale` argument.
- A/B testing on copy. SiteContent is a single string per key.

## 13. Test plan (deferred to implementation PR)

Coverage target: 90 %+ on the client subtree, 100 % on the server entry's branch matrix (owner / not owner / fallback / key present).

Cases:
1. Customer mode renders only the string and no `data-editable-text` attribute.
2. Owner mode renders the pencil affordance.
3. Pencil click → `edit` state, focus moves to editor.
4. Esc in `edit` returns to `read`, focus moves to pencil.
5. Cmd+Enter triggers POST, transitions to `saving`.
6. 200 response transitions through `saved` (visible 2s) back to `read` and the editor closes.
7. 401 transitions to `error` with re-auth copy and `role="alert"`.
8. 409 transitions to `error` and the value is **not** mutated client-side.
9. Network failure transitions to `error` with retry button focused.
10. `multiline` true uses `<textarea>` and Enter inserts a newline.
11. `as="h1"` renders `<h1>` not `<span>` in both modes.
12. Pencil button is keyboard-focusable and has a visible focus ring.
13. Save endpoint receives the `ifMatchUpdatedAt` from the last successful read.

## 14. Open questions for review

- **Tag-based revalidate** — `revalidateTag('site-content')` flushes every page that consumed any SiteContent value. For a 10-edit session this could trigger 10 full-page rebuilds. Worth a per-key tag (`revalidateTag('site-content:hero.headline')`) once we measure?
- **Optimistic UI** — current spec waits for server response before showing the new value. Brenda might perceive 200–800 ms as sluggish. Acceptable for v1; revisit if she complains.
- **Multi-tab behavior** — if Brenda has two tabs open and edits in tab A, tab B's `read` value is stale until next render. Out of scope to push updates; we rely on her workflow not editing the same page across tabs.
- **Audit log** — Brenda edits aren't logged anywhere except Wix's `_updatedDate`. Stilgar may want a separate `SiteContentEditLog` collection for "who/when/what" so a bad edit can be diff-reverted. Worth a follow-up bead.

---

## Refs

- Builds on: PR #472 (cf-4mol — `getSiteContent` reader), PR #473 (cf-h21g — first refactor consumer), PR #1177 (cf-atze — seed module)
- Sibling sub-bead: cfw-ajk.1 — `/api/admin/site-content` mutation endpoint (in flight)
- Parent epic: cfw-66o (owner-friendly admin UI)
