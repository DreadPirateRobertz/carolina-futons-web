import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

// cf-3qt.7.3: Meta Pixel base loader contract.
//
// Mirrors the TikTok/Pinterest test patterns: env-set vs env-unset vs
// invalid-id branches, each in its own dynamic import after stubEnv. The
// next/script mock surfaces the inline-script html as a data attribute
// so the snippet can be inspected without re-rendering
// dangerouslySetInnerHTML.

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
  // Clear any window.fbq the previous test may have installed.
  delete (window as unknown as { fbq?: unknown }).fbq;
});

describe("MetaPixel", () => {
  it("renders the pixel script + noscript fallback when NEXT_PUBLIC_META_PIXEL_ID is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "1234567890123456");
    const { MetaPixel } = await import("@/components/analytics/MetaPixel");
    const { container } = render(<MetaPixel />);
    const script = container.querySelector(
      "[data-script-id='cf-meta-pixel']",
    );
    expect(script).not.toBeNull();
    const snippet = script?.getAttribute("data-snippet") ?? "";
    expect(snippet).toContain("fbq('init', '1234567890123456')");
    expect(snippet).toContain("fbq('track', 'PageView')");
    expect(container.querySelector("noscript")).not.toBeNull();
  });

  it("renders nothing when NEXT_PUBLIC_META_PIXEL_ID is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "");
    const { MetaPixel } = await import("@/components/analytics/MetaPixel");
    const { container } = render(<MetaPixel />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when the pixel ID fails the digits-only validation", async () => {
    // Defense-in-depth: a misconfigured env (whitespace, quotes, HTML
    // metacharacters, alphabetic chars) must NOT be interpolated into
    // the inline script.
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "evil');alert(1);//");
    const { MetaPixel } = await import("@/components/analytics/MetaPixel");
    const { container } = render(<MetaPixel />);
    expect(container.firstChild).toBeNull();
  });
});

describe("fireMetaEvent", () => {
  it("calls window.fbq('track', name, params) when fbq is installed", async () => {
    const fbq = vi.fn();
    (window as unknown as { fbq: typeof fbq }).fbq = fbq;
    const { fireMetaEvent } = await import(
      "@/components/analytics/MetaPixel"
    );
    fireMetaEvent("AddToCart", { value: 12.5, currency: "USD" });
    expect(fbq).toHaveBeenCalledWith("track", "AddToCart", {
      value: 12.5,
      currency: "USD",
    });
  });

  it("is a safe no-op when window.fbq is missing", async () => {
    delete (window as unknown as { fbq?: unknown }).fbq;
    const { fireMetaEvent } = await import(
      "@/components/analytics/MetaPixel"
    );
    // Should not throw — pixel may be blocked, env unset, etc.
    expect(() => fireMetaEvent("Purchase", { value: 1 })).not.toThrow();
  });
});
