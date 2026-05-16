// cf-nm9p (cf-2oku.fu1): focus-visible ring constants.
//
// Across cf-zmsq + cf-2oku + cf-snil + cf-lmwq + cf-978m + cf-9ltt +
// cf-if28 + cf-g0mu (a11y waves 0-6), ~25 components manually pin the
// same focus-visible className quartet. type-design-analyzer flagged
// this in 5+ prior reviews as 'helper consolidation overdue once the
// convention stabilizes'. Convention is stable; this is the helper.
//
// Why named constants instead of a Tailwind 4 @utility / plugin:
// - The codebase composes class strings with `cn(...)` everywhere; a
//   plain string export drops in trivially via cn(focusRingCta, ...).
// - Tailwind @utility would require a build-time class generator which
//   the existing global.css pattern doesn't use.
// - Plain strings are testable verbatim — any drift in the quartet
//   (e.g. someone removes ring-offset-2) loud-fails the per-constant
//   test below.
//
// Variant selection — match the ring color to the underlying background
// so the ring is high-contrast in both light and dark modes:
//
// - focusRingCta: cf-cta (warm orange) on white / cf-cream / cf-sand
//   surfaces. Default for buttons + form submits + product cards +
//   most secondary links. Used by ~20 of the 25 known callsites.
//
// - focusRingEspresso: cf-espresso (dark brown) on cf-sand interior
//   surfaces. Used by PdpGallery (thumbnails, zoom trigger) and the
//   visitor-form addresses. ~3 callsites today.
//
// - focusRingWhite: white ring on dark hero surfaces (Header on full-
//   state homepage). Used by ~3 nav/secondary-link callsites.
//
// - focusRingNavy: cf-navy on the cream newsletter form. 1 callsite
//   today (HomeNewsletterSection) — included for completeness so
//   future newsletter-shape variants don't reinvent the constant.
//
// Pilot consumer in this PR: src/components/member/LogoutButton.tsx.
// Wider refactor of the other 24 callsites lands in cf-2oku.fu2 as
// incremental wave-by-wave touch (cf-ukc6 batches PRs).

export const focusRingCta =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2";

export const focusRingEspresso =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-espresso focus-visible:ring-offset-2";

export const focusRingWhite =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

export const focusRingNavy =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-navy focus-visible:ring-offset-2";
