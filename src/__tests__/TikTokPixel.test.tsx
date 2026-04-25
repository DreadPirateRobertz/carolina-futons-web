import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

// cf-3qt.7.4: TikTok Pixel — Pageview-only contract.
//
// The component reads NEXT_PUBLIC_TIKTOK_PIXEL_ID at module-evaluation
// time. Vitest does not re-evaluate ESM modules between tests by default,
// so each "env present / env absent" case lives in its own dynamic import
// after stubEnv is set. The next/script + next/navigation modules are
// shimmed so we can render in jsdom without a real Next.js runtime.
//
// The mock surfaces the inline-script html as a data attribute (rather
// than re-rendering it) so we can assert on the snippet contents without
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

describe("TikTokPixel", () => {
  it("renders the pixel script when NEXT_PUBLIC_TIKTOK_PIXEL_ID is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_TIKTOK_PIXEL_ID", "ABC123XYZ");
    const { TikTokPixel } = await import(
      "@/components/analytics/TikTokPixel"
    );
    const { container } = render(<TikTokPixel />);
    const script = container.querySelector(
      "[data-script-id='cf-tiktok-pixel']",
    );
    expect(script).not.toBeNull();
    // The script body must reference the configured pixel ID and the
    // ttq.load + ttq.page calls — these are the contract for a fired
    // PageView.
    const snippet = script?.getAttribute("data-snippet") ?? "";
    expect(snippet).toContain("ttq.load('ABC123XYZ')");
    expect(snippet).toContain("ttq.page()");
  });

  it("renders nothing when NEXT_PUBLIC_TIKTOK_PIXEL_ID is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_TIKTOK_PIXEL_ID", "");
    const { TikTokPixel } = await import(
      "@/components/analytics/TikTokPixel"
    );
    const { container } = render(<TikTokPixel />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when the pixel ID fails the alphanumeric validation", async () => {
    // Defense-in-depth: a misconfigured env (whitespace, quotes, HTML
    // metacharacters) must NOT be interpolated into the inline script.
    vi.stubEnv("NEXT_PUBLIC_TIKTOK_PIXEL_ID", "evil');alert(1);//");
    const { TikTokPixel } = await import(
      "@/components/analytics/TikTokPixel"
    );
    const { container } = render(<TikTokPixel />);
    expect(container.firstChild).toBeNull();
  });
});
