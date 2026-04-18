// Real Carolina Futons business data — single source of truth for the static
// pages built in cf-3qt.8.B (/contact, /shipping, /returns, /warranty) and
// available to any future page (Footer, /visit) that wants to stop
// duplicating these facts.

export const BUSINESS = {
  name: "Carolina Futons",
  street: "824 Locust",
  city: "Hendersonville",
  state: "NC",
  phone: "(828) 252-9449",
  phoneHref: "tel:+18282529449",
  email: "hello@carolinafutons.com",
  emailHref: "mailto:hello@carolinafutons.com",
  foundedYear: 1991,
  warrantyYears: 15,
} as const;
