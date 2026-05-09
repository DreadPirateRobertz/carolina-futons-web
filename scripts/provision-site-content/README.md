# Provision SiteContent — Wix CMS collection + seed rows

**Bead:** cfw-roi (cf-atze) — sub-bead of cfw-66o (Brenda admin epic).
**Reader:** `src/lib/cms/site-content.ts` (`getSiteContent(key, fallback)`).
**Spec:** `docs/design/cfw-66o-footer-announce-specs.md`.

This script provisions the `SiteContent` Wix CMS collection and inserts the
20 owner-editable copy rows that back `getSiteContent`. It is **idempotent**
— safe to re-run. Existing rows are never overwritten (Brenda's edits win).

The reader (`src/lib/cms/site-content.ts`) is fail-open, so the storefront
runs correctly today with the collection missing — every call falls back to
the literal in code. After this script runs, those literals are replaced by
the live row, and edits in the Wix CMS dashboard propagate within the 5-minute
revalidate window (or instantly via the `revalidateTag("site-content")` webhook).

## Schema

| Field   | Type        | Notes                                                                |
|---------|-------------|----------------------------------------------------------------------|
| `key`   | `TEXT`      | Dotted-path identifier (e.g. `footer.tagline`). Required, unique-ish. |
| `value` | `RICH_TEXT` | Owner-editable copy. Required.                                        |

Permissions: `read=ANYONE`, `insert/update/remove=ADMIN`.

## Seed rows

20 rows in `seed-data.json`, anchored to existing `getSiteContent(key, fallback)`
call sites and the cfw-66o specs. Categories:

- `footer.*` — Footer tagline, hours label, copyright suffix.
- `visit.*`  — Hours rows + page intro / CTA copy.
- `announcement.rotation.*` — 5 rotation messages + index-3 CTA pair.

## Run it

### 1. Set the secrets (operator with Wix admin access)

```bash
export WIX_BACKEND_KEY=...           # Wix admin API key (account-level)
export WIX_PROVISION_SITE_ID=...     # Wix site ID for the target site
```

`WIX_PROVISION_SITE_ID` is the Wix site ID — find it in the Wix dashboard URL
for the site (`/dashboard/<site-id>/...`) or via the Wix Account API. Use
the **staging** site ID first; only flip to production after the seed shape
has been reviewed in the Wix CMS dashboard.

`WIX_BACKEND_KEY` is the Wix admin API key (the same one used at runtime by
the storefront for backend-authenticated reads). Account-scoped so it can hit
any site under the account.

### 2. Dry-run first

```bash
npm run provision:site-content -- --dry-run
```

This walks the seed file and prints what *would* happen — no API calls, no
writes. Use it to confirm the seed is well-formed before pointing at a real site.

### 3. Apply

```bash
npm run provision:site-content
```

The script will:

1. `getDataCollection("SiteContent")` — if it exists, skip the create.
2. Otherwise `createDataCollection` with the schema above.
3. For each seed row: query by `key`; if the row exists, skip; otherwise `insert`.

Re-runs are safe and report `Skipped=N` for already-present rows.

## Editing the seed

To add a new key:

1. Append a `{ key, value, _source }` entry to `seed-data.json` (`_source` is
   a free-form note pointing at the file/line where the fallback lives — for
   future maintainers).
2. Update `src/__tests__/site-content-seed.test.ts` if the new key is required
   by an in-flight refactor.
3. Re-run the script — only the new row is inserted; existing rows are
   untouched.

To rename or remove a key: do **not** edit the seed. Brenda's row in Wix is
the source of truth post-provision; rename via the CMS dashboard and update
the storefront `getSiteContent("...")` call sites in the same PR.

## What the script does NOT do

- It does **not** webhook-revalidate. Use the existing
  `POST /api/revalidate` route (Wix CMS webhook → `revalidateTag("site-content")`)
  for Brenda's edits to land before the 5-minute window expires.
- It does **not** delete rows. Removing rows is a manual operation — use the
  Wix CMS dashboard.
- It does **not** migrate rows between sites. Run it once per target site.
