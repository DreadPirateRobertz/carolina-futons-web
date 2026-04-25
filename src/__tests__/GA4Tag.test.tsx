import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

// cf-3qt.7.2: GA4 — pageview wiring + env-driven short-circuit.
//
// Mirrors the PinterestTag/TikTokPixel test setup. Component reads
// NEXT_PUBLIC_GA4_MEASUREMENT_ID at module-eval time, so each env case
// lives in its own dynamic import after stubEnv. The next/script mock
// surfaces the inline-script HTML as a data attribute so the test asserts
// on snippet contents safely (no inline HTML reintroduced here).

vi.mock("next/script", () => ({
  default: (props: {
    id?: string;
    src?: string;
    dangerouslySetInnerHTML?: { __html: string };
  }) => {
    const snippet = props.dangerouslySetInnerHTML?.__html ?? "";
    return (
      <script
        data-testid="next-script"
        data-script-id={props.id}
        data-src={props.src ?? ""}
        data-snippet={snippet}
      />
    );
  },
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

describe("GA4Tag", () => {
  it("renders the gtag loader + config script when NEXT_PUBLIC_GA4_MEASUREMENT_ID is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "G-E88HTNX5RJ");
    const { GA4Tag } = await import("@/components/analytics/GA4Tag");
    const { container } = render(<GA4Tag />);
    const loader = container.querySelector(
      "[data-script-id='cf-ga4-loader']",
    );
    const config = container.querySelector(
      "[data-script-id='cf-ga4-config']",
    );
    expect(loader).not.toBeNull();
    expect(loader?.getAttribute("data-src")).toBe(
      "https://www.googletagmanager.com/gtag/js?id=G-E88HTNX5RJ",
    );
    expect(config).not.toBeNull();
    const snippet = config?.getAttribute("data-snippet") ?? "";
    expect(snippet).toContain("gtag('config', 'G-E88HTNX5RJ')");
    expect(snippet).toContain("window.dataLayer");
  });

  it("renders nothing when NEXT_PUBLIC_GA4_MEASUREMENT_ID is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "");
    const { GA4Tag } = await import("@/components/analytics/GA4Tag");
    const { container } = render(<GA4Tag />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when the measurement ID has lowercase characters (UA-style or typo)", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "g-abc123");
    const { GA4Tag } = await import("@/components/analytics/GA4Tag");
    const { container } = render(<GA4Tag />);
    expect(container.firstChild).toBeNull();
  });

  it("rejects an injection attempt in the measurement ID env var", async () => {
    // Defense-in-depth: a misconfigured env (HTML metacharacters, single
    // quotes, semicolons) MUST NOT pass the regex and reach the inline
    // script payload.
    vi.stubEnv(
      "NEXT_PUBLIC_GA4_MEASUREMENT_ID",
      "G-A');alert(1);//",
    );
    const { GA4Tag } = await import("@/components/analytics/GA4Tag");
    const { container } = render(<GA4Tag />);
    expect(container.firstChild).toBeNull();
  });

  it("rejects a measurement ID without the G- prefix", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "E88HTNX5RJ");
    const { GA4Tag } = await import("@/components/analytics/GA4Tag");
    const { container } = render(<GA4Tag />);
    expect(container.firstChild).toBeNull();
  });
});
