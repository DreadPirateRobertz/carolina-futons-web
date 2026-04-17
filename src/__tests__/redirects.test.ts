import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("next.config redirects (cf-tjh)", () => {
  it("maps all legacy nav paths to /shop/<slug> with permanent: true", async () => {
    const redirects = await nextConfig.redirects!();
    const bySource = Object.fromEntries(redirects.map((r) => [r.source, r]));

    const expected = [
      ["/futons", "/shop/futon-frames"],
      ["/murphy-beds", "/shop/murphy-cabinet-beds"],
      ["/mattresses", "/shop/mattresses"],
      ["/frames", "/shop/platform-beds"],
      ["/sale", "/shop/mattresses-sale"],
    ] as const;

    expected.forEach(([source, destination]) => {
      expect(bySource[source], `redirect for ${source}`).toBeDefined();
      expect(bySource[source].destination).toBe(destination);
      expect(bySource[source].permanent).toBe(true);
    });
  });
});
