import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

// cf-3qt.7.5: Pinterest Tag — Pageview-only contract.
//
// Mirrors the TikTokPixel test setup. The component reads
// NEXT_PUBLIC_PINTEREST_TAG_ID at module-evaluation time, so each
// env-set / env-unset / invalid-id case lives in its own dynamic import
// after stubEnv. The mock surfaces the inline-script html as a data
// attribute so we can assert on the snippet contents without
// reintroducing a dangerouslySetInnerHTML in the test surface.

vi.mock("next/script", () => ({
  default: (props: {
    id?: string;
    dangerouslySetInnerHTML?: { __html: string };
  }) => (
    <script
      data-testid="next-script"
      data-script-id={props.id}
      data-snippet={props.dangerouslySetInnerHTML?.__html ?? ""}
    />
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("PinterestTag", () => {
  it("renders the tag script + noscript fallback when NEXT_PUBLIC_PINTEREST_TAG_ID is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_PINTEREST_TAG_ID", "1234567890123");
    const { PinterestTag } = await import(
      "@/components/analytics/PinterestTag"
    );
    const { container } = render(<PinterestTag />);
    const script = container.querySelector(
      "[data-script-id='cf-pinterest-tag']",
    );
    expect(script).not.toBeNull();
    const snippet = script?.getAttribute("data-snippet") ?? "";
    expect(snippet).toContain("pintrk('load', '1234567890123'");
    expect(snippet).toContain("pintrk('page')");
    // <noscript> element is mounted; React only serializes its body on
    // the server, so the inner text is empty in the jsdom CSR pass.
    // SSR-only assertion would need a separate renderToString test.
    expect(container.querySelector("noscript")).not.toBeNull();
  });

  it("renders nothing when NEXT_PUBLIC_PINTEREST_TAG_ID is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_PINTEREST_TAG_ID", "");
    const { PinterestTag } = await import(
      "@/components/analytics/PinterestTag"
    );
    const { container } = render(<PinterestTag />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when the tag ID fails the digits-only validation", async () => {
    // Defense-in-depth: a misconfigured env (whitespace, quotes, HTML
    // metacharacters, alphabetic chars) must NOT be interpolated into the
    // inline script.
    vi.stubEnv("NEXT_PUBLIC_PINTEREST_TAG_ID", "evil');alert(1);//");
    const { PinterestTag } = await import(
      "@/components/analytics/PinterestTag"
    );
    const { container } = render(<PinterestTag />);
    expect(container.firstChild).toBeNull();
  });
});
