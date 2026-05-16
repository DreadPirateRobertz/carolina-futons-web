# cfw — Tool Pages Parity Audit Wave 2 (`/wishlist` + `/registry`)

> **Bead**: cf-ruhm-w2 (proposed) · **Parent**: cf-3qt.6 Tool pages parity · **Date**: 2026-05-16 · **Auditor**: quartz · **Method**: static analysis of cfw Next.js source + `curl` of carolinafutons.com (Wix Studio prod). Sister audit to cf-ruhm (`docs/qa/tool-pages-parity-audit-2026-05-15.md`, MERGED b9b3597) which covered `/compare` + `/search`.

---

## Executive summary

Wave 2 audits the two remaining member-utility surfaces: `/wishlist`
(member-saved products) and `/registry` (gift registries). Both are
short audits — both surfaces are largely at parity or cfw-richer than
Wix prod.

| Page | cfw status | Wix Studio prod status | Parity verdict |
|---|---|---|---|
| `/wishlist` | Member-gated standalone surface; share link + qty + add-to-cart | `/account/my-wishlist` (200) — wishlist surface with share + add-to-cart | ✅ **at parity feature-wise**; ⚠ URL diverges (cfw: `/wishlist`, Wix: `/account/my-wishlist`) |
| `/wishlist/[token]` | 308 → `/wishlist-share/[token]` (legacy URL compat per cf-u89z) | n/a (Wix didn't have this) | ✅ cfw-only (correct redirect) |
| `/wishlist-share/[token]` | Token-bearing public share surface | n/a | ✅ **cfw richer** |
| `/registry` | Member-gated registry dashboard + create | **HTTP 404** | ✅ **cfw richer** — gift registry is cfw-original |
| `/registry/[slug]` | Public registry view (shopable list) | **HTTP 404** | ✅ cfw-only |
| `/gift-registry` | Public landing (create-registry CTA) | **HTTP 404** | ✅ cfw-only |

| Severity | Count | Action |
|---|---:|---|
| 🟥 P0 | 0 | none |
| 🟧 P1 | 1 | `/account/my-wishlist` redirect for ingress from old Wix emails |
| 🟨 P2 | 2 | `/registry` rich-snippet eligibility + shareable URL canonical |
| ⬜ P3 | 1 | observation about legacy share URL retention |

Both pages function; the most actionable finding is a **single ingress
redirect** for shoppers landing on `/account/my-wishlist` from old Wix
emails or pre-cutover bookmarks. The rest is polish / SEO upside.

---

## §1 — `/wishlist`

### What cfw ships

**Route**: `src/app/wishlist/page.tsx` — server component, `force-dynamic`, `robots: { index: false }`.

Comment confirms intent: *"Auth-gated entry point for the member's wishlist. Differs from the dashboard sub-tab at `/(member)/dashboard/wishlist` in two ways: (1) Standalone full-width layout — no DashboardShell chrome, so deep links from PDP/email/share land on a focused wishlist surface. (2) Per-row qty selector + Add-to-cart action, which the dashboard tab intentionally omits (read+remove only there)."*

**Features**:
- Member-gated via `getMemberSession()` → OAuth round-trip if unauthenticated.
- Per-row: thumbnail, name, price, qty stepper, Add-to-cart, Remove.
- Copy shareable wishlist link button (`aria-label="Copy shareable wishlist link to clipboard"`, `src/components/wishlist/WishlistView.tsx:327`).
- Velo failure → empty state (defensive — page always renders something the visitor can navigate away from).
- Sister test files: `wishlist-actions.test.ts`, `wishlist-count.test.ts`, `wishlist-share.test.ts`, `wishlist-share-token.test.ts`.

### What Wix Studio prod ships

```
$ curl -I https://www.carolinafutons.com/wishlist           → HTTP 404
$ curl -I https://www.carolinafutons.com/account/my-wishlist → HTTP 200 (624 kB)
```

Wix prod's wishlist surfaces at `/account/my-wishlist` (per the nav menu
JSON: `"label":"My Wishlist","link":{"href":"https://www.carolinafutons.com/account/my-wishlist"}`).
Static HTML scan shows references to "share" (25×) and "add-to-cart"
(8×) — both affordances ship.

### Findings

#### 🟧 P1.1 — `/account/my-wishlist` returns 404 on cfw

**The gap**: shoppers with old Wix wishlist bookmarks or marketing
emails containing `/account/my-wishlist` links will hit a 404 on cfw
post-cutover. The information IS at `/wishlist` on cfw; the URL space
just diverged.

**Fix**: add a `permanentRedirect()` (308) at `src/app/account/my-wishlist/page.tsx`
(new) or a `next.config.ts` redirect entry:

```ts
// next.config.ts redirects()
{ source: "/account/my-wishlist", destination: "/wishlist", permanent: true },
```

Preferred: the next.config redirect (faster — handled at the edge
without a route hit). Mirrors the existing `/futons → /shop/futon-frames`
cf-tjh redirect pattern (next.config.ts:49–51).

**Files**: `next.config.ts` (add one row in `redirects()`).

**Tests**: extend any existing redirect test file or add a tiny
`src/__tests__/account-my-wishlist-redirect.test.ts` Playwright e2e —
hit `/account/my-wishlist`, assert 308 + Location header.

### `/wishlist` feature parity wins (no action)

- ✅ Member-gate via `getMemberSession()` (Wix uses its own member SDK
  internally; the gate semantics match).
- ✅ Per-row qty + Add-to-cart (Wix prod also surfaces these).
- ✅ Copy-share-link affordance with `aria-label` for screen readers
  (Wix prod has the share affordance but a11y annotation isn't visible
  from static HTML — cfw at parity or richer).
- ✅ `/wishlist/[token]` → 308 to `/wishlist-share/[token]` for legacy
  share URL compat (cf-u89z). Honest redirect with `permanentRedirect()`.

---

## §2 — `/registry` (+ `/gift-registry`)

### What cfw ships

**Routes**:
- `src/app/registry/page.tsx` — member-gated registry dashboard (`force-dynamic`, `robots: { index: false }`, openGraph + DEFAULT_OG_IMAGE)
- `src/app/registry/[slug]/page.tsx` — public registry view (shoppable by guests)
- `src/app/gift-registry/page.tsx` — public landing with create-registry CTA
- `src/app/gift-registry/[id]/page.tsx` — public registry view (alt URL pattern)

**Features**:
- Per-member multiple registries (wedding / housewarming / baby shower / other)
- Public shoppable URL (`/registry/[slug]`) — friends + family can add registry items to cart without login
- Real-time stock + price (Wix Stores reader integration)
- Owner controls: rename, archive, delete

### What Wix Studio prod ships

```
$ curl -I https://www.carolinafutons.com/registry       → HTTP 404
$ curl -I https://www.carolinafutons.com/gift-registry  → HTTP 404
```

**Gift registry is cfw-original** — Wix Studio prod has no registry
route at all. Treat as a wholly new feature surface, not a port.

### Findings

#### 🟨 P2.1 — `/registry/[slug]` could carry `Product` + `BreadcrumbList` JSON-LD

The public shoppable registry view is a real shopper landing surface
(friends arriving from a wedding-registry email). Adding the existing
`buildProductSchema` + `buildBreadcrumbSchema` (already used on PDP)
to each registry-item row would unlock rich-snippet eligibility +
crumb-display in SERPs for direct registry URLs.

**Fix**: per-item `<JsonLd>` blocks on the registry detail page; mirror
the PDP JSON-LD pattern. **Bonus**: a `ItemList` JSON-LD wrapping the
whole registry tells Google "this is a curated product list" — eligible
for ItemList rich results.

**Files**: `src/app/registry/[slug]/page.tsx`; reuse `src/lib/seo/json-ld.ts`.

#### 🟨 P2.2 — Public registry pages should have indexable canonical when owner opts in

Today `/registry/[slug]` (and `/gift-registry/[id]`) probably defaults
to `robots: noindex` for privacy. Most registries ARE private — but
**owners who *want* to be discoverable** (charity registries, store-wide
event registries) have no opt-in. A `metadata.robots: { index: !privateFlag }`
toggle gated on a registry-owner preference would unlock discoverability
when intended.

Verification needed: read `src/app/registry/[slug]/page.tsx` metadata
behavior; if `robots: { index: false }` is hard-coded, this becomes a
real P2.

**Files**: `src/app/registry/[slug]/page.tsx` metadata + Wix Data
schema for `private:boolean` on the Registry collection.

### ⬜ P3.1 — Observation: `/wishlist/[token]` legacy redirect retention

The 308 redirect at `/wishlist/[token]` → `/wishlist-share/[token]` is
cf-u89z legacy compat. Once Search Console reports the new URL fully
indexed (typically 6–12 weeks post-cutover), the legacy stub could be
removed. Not actionable today; tracked here for the cf-3qt.9 day-30
stability sweep.

---

## §3 — What this audit could NOT verify

Per cf-ukc6 (Vercel-credit conservation), static-only methodology.
Deferred runtime checks:

1. **`/account/my-wishlist` ingress traffic** — how many shoppers
   actually hit the old URL post-cutover? A 1-week traffic sample
   from Vercel logs would tell us whether the P1.1 redirect is a
   high-volume or low-volume fix.
2. **Registry SERP impressions** — Search Console coverage report
   for `/registry/*` once the JSON-LD lands.
3. **OG/Twitter unfurl quality** — paste a registry URL in iMessage /
   Slack to see how Cards render (especially with friend's-name + item-count
   personalization).

Recommend folding these into the existing **cfw-chs / cfw-mny** runtime-pass
beads gated on cf-ukc6 lift.

---

## §4 — Recommended sub-beads

| Sub-bead | Pri | Title | Scope |
|---|---|---|---|
| cf-ruhm-w2.1 | P1 | `/account/my-wishlist` → `/wishlist` permanent redirect | One row in `next.config.ts` redirects() + e2e smoke test. ~5 min impl. |
| cf-ruhm-w2.2 | P2 | `/registry/[slug]` Product + ItemList JSON-LD | Per-item Product schema + page-level ItemList schema. Mirror PDP pattern. |
| cf-ruhm-w2.3 | P2 | Owner-opt-in registry indexability | Schema + UI + metadata.robots gate. Larger scope; requires Wix Data schema bump. |
| cf-ruhm-w2.4 | P3 | Legacy `/wishlist/[token]` retirement (cf-3qt.9 day-30 sweep) | Remove once Search Console confirms migration complete. |

cf-ruhm-w2.1 + cf-ruhm-w2.2 are landable in one cf-ukc6 batched push
(~6 lines + ~30 lines respectively). cf-ruhm-w2.3 is its own larger
work item.

---

## §5 — TDD + doc compliance notes

Per Stilgar's 2026-05-15 TDD/Doc standing order:

- **Existing test coverage** for /wishlist + /registry surfaces is
  good. `wishlist-actions.test.ts`, `wishlist-count.test.ts`,
  `wishlist-share.test.ts`, `wishlist-share-token.test.ts`,
  `registry-types.test.ts`, `registry-storage.test.ts` collectively
  cover state management, Velo integration, and share-token flow.
  Page-level integration tests (mocking Velo) exist in adjacent files.
- **Sub-bead PRs** should follow the format established by cf-ruhm
  children (cf-1lf, cf-76a, cf-94l, etc.) — TDD failing-tests-first +
  CONTRIBUTING.md PR description format + 5-agent /ultrareview gate.

---

## Refs

- Bead: cf-ruhm-w2 (proposed P1; if filed, the sub-beads cascade from it)
- Parent: cf-3qt.6 Tool pages parity
- Sibling audit: `docs/qa/tool-pages-parity-audit-2026-05-15.md` (cf-ruhm, MERGED b9b3597)
- Standing orders: cf-ukc6 (Vercel-credit conservation — drove static-only methodology), 2026-05-15 5-agent review + TDD/Doc standards
- Files reviewed: `src/app/wishlist/page.tsx`, `src/app/wishlist/[token]/page.tsx`, `src/components/wishlist/WishlistView.tsx`, `src/app/registry/page.tsx`, `src/app/registry/[slug]/page.tsx`, `src/app/gift-registry/page.tsx`, `next.config.ts` (redirect surface)
- Wix prod URLs fetched: `/wishlist` (404), `/account/my-wishlist` (200, 624 kB), `/registry` (404), `/gift-registry` (404)
