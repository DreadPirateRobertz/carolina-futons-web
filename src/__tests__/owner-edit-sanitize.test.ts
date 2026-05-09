import { describe, it, expect } from "vitest";

import { sanitizeOwnerHtml } from "@/lib/cms/owner-edit-sanitize";

// cfw-qyy (cfw-6qd.12 follow-up part c): allowlist sanitiser for owner
// SiteContent edits. These tests pin both the happy path (Brenda's actual
// editor output survives intact) and the OWASP XSS cheat-sheet payloads
// that motivated this work — a stored XSS in SiteContent could affect
// every page that renders a string from the collection.

describe("sanitizeOwnerHtml — happy path (allowed tags survive)", () => {
  it("returns plain strings unchanged", () => {
    expect(sanitizeOwnerHtml("Hardwood frames since 1989")).toBe(
      "Hardwood frames since 1989",
    );
  });

  it("preserves the simple-emphasis allowlist (b/i/strong/em)", () => {
    expect(sanitizeOwnerHtml("<strong>Sale</strong>")).toBe(
      "<strong>Sale</strong>",
    );
    expect(sanitizeOwnerHtml("<em>Limited</em>")).toBe("<em>Limited</em>");
    expect(sanitizeOwnerHtml("<b>bold</b><i>italic</i>")).toBe(
      "<b>bold</b><i>italic</i>",
    );
  });

  it("preserves paragraphs, line breaks, and lists", () => {
    expect(sanitizeOwnerHtml("<p>One.</p><p>Two.</p>")).toBe(
      "<p>One.</p><p>Two.</p>",
    );
    expect(sanitizeOwnerHtml("Line one<br>Line two")).toBe(
      "Line one<br>Line two",
    );
    expect(sanitizeOwnerHtml("<ul><li>A</li><li>B</li></ul>")).toBe(
      "<ul><li>A</li><li>B</li></ul>",
    );
  });

  it("preserves <a> with http(s) and mailto/tel hrefs", () => {
    expect(
      sanitizeOwnerHtml('<a href="https://example.com">link</a>'),
    ).toContain('href="https://example.com"');
    expect(sanitizeOwnerHtml('<a href="mailto:hi@x.com">mail</a>')).toContain(
      'href="mailto:hi@x.com"',
    );
    expect(sanitizeOwnerHtml('<a href="tel:+1-555-0100">call</a>')).toContain(
      'href="tel:+1-555-0100"',
    );
  });

  it("preserves relative + fragment hrefs (internal links)", () => {
    expect(sanitizeOwnerHtml('<a href="/shop">shop</a>')).toContain(
      'href="/shop"',
    );
    expect(sanitizeOwnerHtml('<a href="#section">jump</a>')).toContain(
      'href="#section"',
    );
  });
});

describe("sanitizeOwnerHtml — disallowed tags stripped", () => {
  it("strips disallowed wrapper tags but keeps text content", () => {
    expect(sanitizeOwnerHtml("<div>hello</div>")).toBe("hello");
    expect(sanitizeOwnerHtml("<span>x</span>")).toBe("x");
    expect(sanitizeOwnerHtml("<h1>Big</h1>")).toBe("Big");
  });

  it("strips images entirely (KEEP_CONTENT default behaviour for void elements)", () => {
    // <img> isn't on the allowlist; void elements have no text content so
    // nothing should remain.
    expect(sanitizeOwnerHtml('<img src="x.png" alt="x">')).toBe("");
  });
});

describe("sanitizeOwnerHtml — XSS hardening (OWASP cheat-sheet)", () => {
  it("drops <script> tag AND its content (no leakage of payload text)", () => {
    expect(sanitizeOwnerHtml("<script>alert(1)</script>")).toBe("");
    expect(
      sanitizeOwnerHtml("Hello <script>alert(1)</script>World"),
    ).toBe("Hello World");
  });

  it("strips on*= event handlers from allowed tags", () => {
    const out = sanitizeOwnerHtml('<a href="https://x.com" onclick="alert(1)">x</a>');
    expect(out).toContain('href="https://x.com"');
    expect(out).not.toMatch(/onclick/i);
    expect(out).not.toMatch(/alert/i);
  });

  it("strips javascript: hrefs", () => {
    const out = sanitizeOwnerHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toMatch(/javascript:/i);
    expect(out).not.toMatch(/alert\(1\)/);
  });

  it("strips data: hrefs", () => {
    const out = sanitizeOwnerHtml(
      '<a href="data:text/html,<script>alert(1)</script>">x</a>',
    );
    expect(out).not.toMatch(/data:/i);
    expect(out).not.toMatch(/script/i);
  });

  it("strips vbscript: hrefs", () => {
    const out = sanitizeOwnerHtml('<a href="vbscript:msgbox(1)">x</a>');
    expect(out).not.toMatch(/vbscript:/i);
  });

  it("strips <iframe>, <object>, <embed>", () => {
    expect(
      sanitizeOwnerHtml('<iframe src="https://evil.com"></iframe>'),
    ).toBe("");
    expect(
      sanitizeOwnerHtml('<object data="https://evil.com"></object>'),
    ).toBe("");
    expect(
      sanitizeOwnerHtml('<embed src="https://evil.com">'),
    ).toBe("");
  });

  it("strips <style> blocks and their content", () => {
    expect(
      sanitizeOwnerHtml("<style>body{background:red}</style>"),
    ).toBe("");
  });

  it("strips <form> wrappers used for clickjacking-style attacks", () => {
    // Form contents (input) is also non-allowlisted, so the entire payload
    // should sanitize away.
    const out = sanitizeOwnerHtml(
      '<form action="https://evil.com"><input name="csrf"></form>',
    );
    expect(out).not.toMatch(/<form/i);
    expect(out).not.toMatch(/<input/i);
    expect(out).not.toMatch(/evil\.com/i);
  });

  it("neutralises common OWASP <img onerror> XSS", () => {
    // <img> not allowlisted → fully stripped (no chance for onerror to fire).
    const out = sanitizeOwnerHtml('<img src=x onerror=alert(1)>');
    expect(out).toBe("");
  });

  it("neutralises <svg onload> XSS", () => {
    const out = sanitizeOwnerHtml('<svg/onload=alert(1)>');
    expect(out).not.toMatch(/onload/i);
    expect(out).not.toMatch(/alert/i);
  });

  it("returns empty string for empty / falsy input without throwing", () => {
    expect(sanitizeOwnerHtml("")).toBe("");
  });
});
