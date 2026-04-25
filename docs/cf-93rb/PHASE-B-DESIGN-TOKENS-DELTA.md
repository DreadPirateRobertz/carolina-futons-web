# cf-93rb Phase B Prep — Design Tokens Delta Matrix

**Status:** Awaiting Stilgar's verdict. No code changes proposed yet.
**Date:** 2026-04-25
**Author:** blaidd (cfutons/crew)
**Source A:** `EDITOR-HOOKUP-GUIDE.md` § Design Tokens (lines 2557–2566) in the cfutons/crew/blaidd Wix repo.
**Source B:** `src/app/globals.css` `:root` block in this (carolina-futons-web) repo.

## Summary

The Wix-side hookup guide enumerates **6 brand color tokens** in a warm Blue-Ridge-clay palette (Espresso, Mountain Blue, Coral, Sand Light, Sand Medium, Cream). The cfw `globals.css` ships **12 brand tokens** plus 4 chrome tokens — but only 2 of the 6 guide tokens land at the same hex value. The remainder are either **renamed** (semantically the same role under a different cfw name), **shifted** (similar role, noticeably different hex), or **missing** (no cfw equivalent).

The most visually consequential delta: **`--cf-cta` is `#4a7d94` (a desaturated teal) — the guide expects "Coral" `#E8845C` (warm orange-coral)**. Every primary CTA on cfw renders in the wrong hue family; the inline CSS comment even mislabels `#4a7d94` as "sunset coral". This is almost certainly the root cause of stilgar's "way too plain" feedback — the page is missing the brand's warm accent entirely.

## Token-by-token matrix

| Hookup-guide token | Guide hex | cfw token | cfw hex | Status | Delta notes |
| --- | --- | --- | --- | --- | --- |
| Espresso | `#3A2518` | `--cf-espresso` | `#3a2518` | ✅ MATCH | Exact match. Used as legacy accent in cfw; guide says "Headers, trust bar bg, primary dark". |
| Mountain Blue | `#5B8FA8` | `--cf-blue` | `#5b8fa8` | ✅ MATCH | Exact match. Guide says "Accents, links, CTA secondary"; cfw uses it that way too. |
| Coral | `#E8845C` | `--cf-cta` | `#4a7d94` | ❌ **MISMATCH (hue)** | cfw flipped the primary CTA to a desaturated teal. Inline CSS comment says "sunset coral" but the hex is teal — comment is misleading. **Highest-impact delta.** |
| Sand Light | `#FAF7F2` | `--cf-sand` | `#f0f4f8` | ❌ **MISMATCH (hue)** | Guide is warm cream-tan; cfw is cool blue-gray. Same role ("Page backgrounds") but different palette family. |
| Sand Medium | `#F5F0E8` | _(none)_ | _n/a_ | ⚠️ MISSING | No cfw token for warm card backgrounds. cfw uses `--cf-cream` for cards, which is closer to the guide's "Cream" than its "Sand Medium". |
| Cream | `#FFF8F0` | `--cf-cream` | `#fefcf7` | ⚠️ NEAR | Both are warm off-whites; cfw is paler (`#fefcf7` vs guide `#FFF8F0`). ΔE ~3 — visible side-by-side. |

## cfw extras (not in guide)

These tokens exist in cfw `:root` but have no counterpart in the hookup-guide § Design Tokens. Flagging them for Stilgar's call on whether they should: (a) stay as cfw-only semantic tokens, (b) be derived from one of the 6 brand tokens, or (c) be retired entirely.

| cfw token | cfw hex | cfw role | Suggestion (for Stilgar) |
| --- | --- | --- | --- |
| `--cf-navy` | `#1e3a5f` | Accent / dark header | Guide has no navy. cfw applies `cf-navy` to headers where the guide would expect Espresso (`#3A2518`). Decide: replace with Espresso, keep as a separate "deep brand" variant, or merge. |
| `--cf-cta-hover` | `#3d6a80` | CTA hover state | Tied to the wrong-hue `--cf-cta`. If CTA flips to coral, this needs a coral-darken pair (e.g. `#C8623E`). |
| `--cf-charcoal` | `#1a1a1a` | Body text | Semantic; no guide guidance. Keep. |
| `--cf-divider` | `#e2e8f0` | Hairline dividers | Semantic; cool gray-blue. Keep, or warm-shift to match a sand palette if Stilgar wants visual continuity with backgrounds. |
| `--cf-success` / `--cf-warning` / `--cf-error` | `#2f855a` / `#c05621` / `#c53030` | Status colors | Semantic. Keep. |
| `--cf-header-start` / `--cf-header-end` | `#F0F5F8` / `#E4EDF2` | Header gradient (cf-9jp) | Mirrors STAGING_SITE Velo CSS. Out of scope for the guide's § Design Tokens, but flag for parity check against carolinafutons.com production. |
| `--cf-footer-bg` / `--cf-ink` | `#1E2A3A` | Dark navy chrome | Mirrors carolinafutons.com production. Same out-of-scope note. |

## shadcn semantic tokens — derived layer

`:root` also defines the shadcn semantic palette (`--background`, `--foreground`, `--primary`, `--accent`, etc.) in `oklch()` form, mapped to the cfw cool-blue interpretation. If Stilgar accepts the guide's warm palette as the truth, **every shadcn semantic token would need re-derivation** because the current oklch values bake in the cool-blue hue:

- `--primary: oklch(0.547 0.053 232)` → currently ≈ `#4a7d94` (teal). Coral would be ~`oklch(0.69 0.155 38)`.
- `--background: oklch(0.966 0.008 230)` → currently cool sand `#f0f4f8`. Warm sand light would be ~`oklch(0.971 0.01 80)`.
- `--accent: oklch(0.322 0.058 260)` → currently `#1e3a5f` (cf-navy). Espresso would be ~`oklch(0.27 0.046 50)`.

Out of scope for this matrix; including only so Stilgar can scope a follow-up.

## Open questions for Stilgar

1. **CTA hue** — confirm primary CTA should flip to Coral `#E8845C` (full re-skin) vs. stay teal (guide is wrong / outdated). Highest-impact decision.
2. **Sand family** — adopt the guide's warm Sand Light/Medium and rename `--cf-sand` (cool blue-gray) to something like `--cf-sand-cool`, or pick one or the other.
3. **Navy vs. Espresso** — guide doesn't have a navy. Is `--cf-navy` an intentional cfw addition (different role from Espresso), or a drift to be reverted?
4. **Cream** — close enough, or pin to guide value `#FFF8F0`?
5. **Dark-mode mapping** — `.dark` block currently mirrors the cool palette. If brand goes warm, dark-mode also needs a re-derive.

## Blockers for Phase B

None — this is observation only. Phase B implementation is gated on Stilgar's call on (1) and (2) above; (3)–(5) can be folded into the same change set or split.
