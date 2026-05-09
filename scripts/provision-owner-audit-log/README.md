# `provision-owner-audit-log`

Provisions the **OwnerAuditLog** Wix CMS collection that backs
`recordOwnerEdit` (cfw-6qd.11) and `/admin/audit` (cfw-xlv).

Without this, every owner edit silently drops its audit row and
`/admin/audit` shows the "may not be provisioned" banner.

## Usage

```bash
# dry-run first — prints the collection schema without touching Wix
WIX_BACKEND_KEY=... WIX_PROVISION_SITE_ID=... \
  npm run provision:owner-audit-log -- --dry-run

# real run — idempotent, safe to re-run
WIX_BACKEND_KEY=... WIX_PROVISION_SITE_ID=... \
  npm run provision:owner-audit-log
```

## Env vars

- `WIX_BACKEND_KEY` — Wix API key with permission to manage the
  site's CMS collections. Generate from Wix Dashboard → Settings →
  Headless Settings → API Keys.
- `WIX_PROVISION_SITE_ID` — the site ID the API key is scoped to.

## What it does

1. Probes the OwnerAuditLog collection. Skips if it already exists.
2. Creates the collection with the schema needed by `recordOwnerEdit`:
   `ts`, `actorEmail`, `action`, `target`, `before`, `after`.
3. Permissions: read `ANYONE` (the `/admin/audit` viewer), insert
   `SITE_MEMBER` (so allowlisted owners can append rows under their
   member tokens), update/remove `ADMIN` only (audit is append-only).

## Companion scripts

- `provision-site-content` — owner-editable copy collection
  (cfw-roi/cf-atze).
- `provision-site-content-history` — undo trail (cfw-p4t, sibling).
