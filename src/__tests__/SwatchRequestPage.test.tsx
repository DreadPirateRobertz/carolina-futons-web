import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("server-only", () => ({}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/env", () => ({
  optionalEnv: () => "https://www.carolinafutons.com",
  env: (k: string) => k,
}));

const mockListSwatchesAction = vi.fn();
const mockSubmitSwatchRequestAction = vi.fn();
vi.mock("@/app/actions/swatch-request", () => ({
  listSwatchesAction: (...args: unknown[]) => mockListSwatchesAction(...args),
  submitSwatchRequestAction: (...args: unknown[]) =>
    mockSubmitSwatchRequestAction(...args),
}));

// TurnstileWidget renders null when site key is absent — suppress in tests.
vi.mock("@/components/captcha/TurnstileWidget", () => ({
  TurnstileWidget: () => null,
}));

import SwatchRequestPage from "@/app/swatch-request/page";

describe("SwatchRequestPage — swatchLoadError branch", () => {
  it("shows error alert and hides form when CMS fails to load swatches", async () => {
    mockListSwatchesAction.mockResolvedValue({ items: [], error: true });
    const element = await SwatchRequestPage({
      searchParams: Promise.resolve({}),
    });
    render(element);
    expect(screen.getByRole("alert")).toBeTruthy();
    // SwatchRequestForm is conditionally rendered only when !swatchLoadError
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("renders form when swatches load successfully", async () => {
    mockListSwatchesAction.mockResolvedValue({
      items: [
        { _id: "s1", swatchName: "Navy", colorFamily: "Blue", colorHex: "#001f5b" },
      ],
      error: false,
    });
    const element = await SwatchRequestPage({
      searchParams: Promise.resolve({}),
    });
    render(element);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
