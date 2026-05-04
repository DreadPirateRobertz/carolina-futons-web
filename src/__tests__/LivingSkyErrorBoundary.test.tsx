import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const captureException = vi.hoisted(() => vi.fn());
vi.mock("@sentry/nextjs", () => ({ captureException }));

import { LivingSkyErrorBoundary } from "@/components/illustrations/LivingSkyErrorBoundary";

afterEach(() => {
  cleanup();
  captureException.mockClear();
});

// Suppress React's error boundary console.error noise in test output.
const muteConsoleError = () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  return () => spy.mockRestore();
};

describe("LivingSkyErrorBoundary (cf-9cgu)", () => {
  it("renders children when no error occurs", () => {
    render(
      <LivingSkyErrorBoundary>
        <span data-testid="child">sky</span>
      </LivingSkyErrorBoundary>,
    );
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  it("renders null (not a crash) when child throws", () => {
    const restore = muteConsoleError();
    const Thrower = () => { throw new Error("computeLivingSky blew up"); };
    const { container } = render(
      <LivingSkyErrorBoundary>
        <Thrower />
      </LivingSkyErrorBoundary>,
    );
    expect(container.firstChild).toBeNull();
    restore();
  });

  it("calls Sentry.captureException with the thrown error and component tag", () => {
    const restore = muteConsoleError();
    const boom = new Error("sky render failed");
    const Thrower = () => { throw boom; };
    render(
      <LivingSkyErrorBoundary>
        <Thrower />
      </LivingSkyErrorBoundary>,
    );
    expect(captureException).toHaveBeenCalledWith(boom, expect.objectContaining({
      tags: expect.objectContaining({ component: "LivingSkyClient" }),
    }));
    restore();
  });
});
