# `provision-site-content-history`

Provisions the **SiteContentHistory** Wix CMS collection that backs
`writeSiteContentHistory` / `readSiteContentHistory` (cfw-6qd.10) and
the EditableText ↶ undo icon (cfw-plg).

Without this, every owner edit silently drops its history row and
the ↶ icon shows an empty versions list for every key.

## Usage

```bash
# dry-run first — prints the collection schema without touching Wix
WIX_BACKEND_KEY=... WIX_PROVISION_SITE_ID=... \
  npm run provision:site-content-history -- --dry-run

# real run — idempotent, safe to re-run
WIX_BACKEND_KEY=... WIX_PROVISION_SITE_ID=... \
  npm run provision:site-content-history
```

## Env vars

- `WIX_BACKEND_KEY` — Wix API key with permission to manage CMS
  collections.
- `WIX_PROVISION_SITE_ID` — the site ID the API key is scoped to.

## What it does

1. Probes the SiteContentHistory collection. Skips if it already exists.
2. Creates the collection with the schema needed by `writeSiteContentHistory`:
   `key`, `before`, `after`, `actorEmail`.
3. Permissions: read `ANYONE` (the ↶ icon's GET endpoint), insert
   `SITE_MEMBER` (allowlisted owners writing under member tokens),
   update/remove `ADMIN` only — history is append-only.

## Companion scripts

- `provision-site-content` — owner-editable copy collection (cfw-roi).
- `provision-owner-audit-log` — audit trail (cfw-p4t, sibling).
