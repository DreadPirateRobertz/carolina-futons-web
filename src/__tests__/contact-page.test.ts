/**
 * cf-bbu5 (cf-7pk0.F2): pin /contact's SiteContent wiring + the
 * single-source-of-truth invariant for showroom hours vs /visit.
 *
 * Source-grep style: each contract is asserted by reading page.tsx as
 * a string and matching imports + getSiteContent callsites + key names.
 * The drift threat model is "someone hardcodes a heading or splits the
 * hours key" — both fail loudly in CI without needing a server-component
 * render mock.
 *
 * Sibling pattern: /visit (gold standard, fully SiteContent-wired) +
 * the cf-nm6p-guides-breadcrumb-jsonld.test.ts source-grep convention.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CONTACT = readFileSync(
  resolve(__dirname, "../app/contact/page.tsx"),
  "utf8",
);
const VISIT = readFileSync(
  resolve(__dirname, "../app/visit/page.tsx"),
  "utf8",
);
const SHOWROOM_HOURS = readFileSync(
  resolve(__dirname, "../lib/business/showroom-hours.ts"),
  "utf8",
);

describe("/contact SiteContent wiring (cf-bbu5)", () => {
  it("imports getSiteContent from the CMS lib", () => {
    expect(CONTACT).toMatch(
      /import\s*{\s*getSiteContent\s*}\s*from\s*["']@\/lib\/cms\/site-content["']/,
    );
  });

  it("imports getShowroomScheduleLine (drift-proof hours composer)", () => {
    expect(CONTACT).toMatch(
      /import\s*{\s*getShowroomScheduleLine\s*}\s*from\s*["']@\/lib\/business\/showroom-hours["']/,
    );
  });

  it("declares fallback constants for every heading + section label", () => {
    // Fallbacks live in a CONTACT_COPY_FALLBACKS object so a Wix-down
    // render still matches the pre-cf-bbu5 hardcoded copy verbatim.
    expect(CONTACT).toMatch(/CONTACT_COPY_FALLBACKS/);
    expect(CONTACT).toMatch(/eyebrow:/);
    expect(CONTACT).toMatch(/introHeading:/);
    expect(CONTACT).toMatch(/introBody:/);
    expect(CONTACT).toMatch(/directHeading:/);
    expect(CONTACT).toMatch(/appointmentHeading:/);
    expect(CONTACT).toMatch(/appointmentBodySuffix:/);
    expect(CONTACT).toMatch(/formHeading:/);
  });

  it("calls getSiteContent for each contact.* key with its fallback", () => {
    expect(CONTACT).toMatch(
      /getSiteContent\(\s*["']contact\.eyebrow["']/,
    );
    expect(CONTACT).toMatch(
      /getSiteContent\(\s*["']contact\.intro\.heading["']/,
    );
    expect(CONTACT).toMatch(
      /getSiteContent\(\s*["']contact\.intro\.body["']/,
    );
    expect(CONTACT).toMatch(
      /getSiteContent\(\s*["']contact\.direct\.heading["']/,
    );
    expect(CONTACT).toMatch(
      /getSiteContent\(\s*["']contact\.appointment\.heading["']/,
    );
    expect(CONTACT).toMatch(
      /getSiteContent\(\s*["']contact\.appointment\.body-suffix["']/,
    );
    expect(CONTACT).toMatch(
      /getSiteContent\(\s*["']contact\.form\.heading["']/,
    );
  });

  it("uses Promise.all to parallelize the SiteContent fetches", () => {
    // Sequential awaits would serialize a Wix-roundtrip per key. The
    // gold-standard pattern in /visit is Promise.all + destructured
    // assignment.
    expect(CONTACT).toMatch(/await\s+Promise\.all\(/);
  });

  it("renders each heading via its destructured variable, not a literal", () => {
    // Negative pin: if a future refactor reverts to inline literals,
    // these JSX-variable assertions fail. We assert the variable
    // appears in a JSX-interpolation `{var}` position for each
    // load-bearing heading.
    expect(CONTACT).toMatch(/<h1[^>]*>\s*{introHeading}\s*<\/h1>/);
    expect(CONTACT).toMatch(/{eyebrow}/);
    expect(CONTACT).toMatch(/{introBody}/);
    expect(CONTACT).toMatch(/{directHeading}/);
    expect(CONTACT).toMatch(/{appointmentHeading}/);
    expect(CONTACT).toMatch(/{formHeading}/);
  });
});

describe("/contact hours single-source-of-truth invariant (cf-bbu5)", () => {
  it("/contact uses getShowroomScheduleLine, NOT a local hours literal", () => {
    expect(CONTACT).toMatch(/getShowroomScheduleLine\(/);
    // Negative pin: drift threats. The pre-fix bug was "Wednesday
    // through Saturday, 10 am–5 pm" hardcoded; lock against any
    // resurrection of that literal or its variations.
    expect(CONTACT).not.toMatch(/Wednesday through Saturday/);
    expect(CONTACT).not.toMatch(/Wed.*Sat.*\d/);
  });

  it("getShowroomScheduleLine reads from the SAME SiteContent keys /visit reads", () => {
    // Drift-proof: the composer pulls from visit.hours.sun-tue +
    // visit.hours.wed-sat — the exact two keys /visit.tsx fetches.
    // If anyone splits the keys (e.g. introduces contact.hours.*),
    // this test fails loudly.
    expect(SHOWROOM_HOURS).toMatch(/visit\.hours\.sun-tue/);
    expect(SHOWROOM_HOURS).toMatch(/visit\.hours\.wed-sat/);
    expect(VISIT).toMatch(/visit\.hours\.sun-tue/);
    expect(VISIT).toMatch(/visit\.hours\.wed-sat/);
  });

  it("/contact does NOT introduce a contact.hours.* SiteContent key", () => {
    // Stronger drift guard: if hours migrates to a contact-scoped key,
    // the single-source-of-truth invariant breaks. Anyone proposing
    // contact.hours.* has to delete this test, forcing a conscious
    // decision.
    expect(CONTACT).not.toMatch(/contact\.hours/);
  });
});
