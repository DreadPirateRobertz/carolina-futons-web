import { describe, expect, it } from "vitest";

import { stripHtml } from "@/lib/text/strip-html";

// stripHtml is the shared plain-text projection of Wix HTML fields, used by
// the PDP body copy, <meta name="description">, and the Product JSON-LD
// `description`. These pin the contract those three surfaces depend on.
describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<p>Solid <strong>hardwood</strong> frame</p>")).toBe(
      "Solid hardwood frame",
    );
  });

  it("decodes the common named entities", () => {
    expect(stripHtml("Twin&nbsp;&amp;&nbsp;Full &lt;sizes&gt; &quot;here&quot;")).toBe(
      'Twin & Full <sizes> "here"',
    );
    expect(stripHtml("it&#39;s sturdy")).toBe("it's sturdy");
  });

  it("trims surrounding whitespace", () => {
    expect(stripHtml("  <span>  Kingston  </span>  ")).toBe("Kingston");
  });

  it("returns an empty string for empty input", () => {
    expect(stripHtml("")).toBe("");
  });
});
