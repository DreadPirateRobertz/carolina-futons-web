// Real Carolina Futons business data — single source of truth for the static
// pages built in cf-3qt.8.B (/contact, /shipping, /returns, /warranty) and
// available to any future page (Footer, /visit) that wants to stop
// duplicating these facts.

export const BUSINESS = {
  name: "Carolina Futons",
  street: "824 Locust Street, Suite 200",
  city: "Hendersonville",
  state: "NC",
  zip: "28792",
  phone: "(828) 252-9449",
  phoneHref: "tel:+18282529449",
  // The business mailbox is a Gmail address, not a vanity domain.
  // Changing the domain here would silently black-hole contact-form
  // emails to a non-existent inbox.
  email: "carolinafutons@gmail.com",
  emailHref: "mailto:carolinafutons@gmail.com",
  foundedYear: 1991,
  warrantyYears: 15,
} as const;

// Canonical CF social presences. Consumed by the Footer rebrand + the
// Organization JSON-LD `sameAs` array. Handles default to @carolinafutons
// on every platform; if one is ever renamed, update here and both
// surfaces (footer + structured data) flip in lockstep.
export const SOCIALS = [
  { name: "Facebook", href: "https://www.facebook.com/carolinafutons" },
  { name: "Instagram", href: "https://www.instagram.com/carolinafutons" },
  { name: "TikTok", href: "https://www.tiktok.com/@carolinafutons" },
  { name: "Pinterest", href: "https://www.pinterest.com/carolinafutons" },
] as const;
