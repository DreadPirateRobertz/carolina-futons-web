// Real Carolina Futons business data — single source of truth for the static
// pages built in cf-3qt.8.B (/contact, /shipping, /returns, /warranty) and
// available to any future page (Footer, /visit) that wants to stop
// duplicating these facts.

export const BUSINESS = {
  name: "Carolina Futons",
  street: "824 Locust",
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
